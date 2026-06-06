// Edge Function: chat
// Replaces FastAPI `POST /chat/` (app/routers/chat.py).
//
// Differences from the original (documented in supabase/MIGRATION.md):
//   * Semantic retrieval (ChromaDB + sentence-transformers vietnamese-embedding)
//     does NOT run in Deno. Here, catalog context is built from Postgres via
//     keyword search + available-products listing. UPGRADE PATH: add a pgvector
//     `book_embeddings` table + a similarity-search RPC and swap the retrieval
//     block below.
//   * Session history + shipping-fee gathering state move from Redis to the
//     `public.chat_sessions` table.
//   * The GHN shipping-fee intent flow is preserved faithfully (uses the ported
//     _shared/ghn.ts lookups + calculateShippingFee).
//
// Secrets: GROQ_API_KEY, GHN_* (+ SUPABASE_* injected).
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import {
  calculateShippingFee, findDistrict, findProvince, findWard, ghnConfigured,
} from "../_shared/ghn.ts";

const STRICT_SYSTEM_PROMPT =
  "Bạn là trợ lý hỗ trợ khách hàng cho cửa hàng Tâm Nguồn - chuyên bán sách, văn phòng phẩm, dụng cụ yoga và các sản phẩm tâm linh.\n" +
  "Bạn PHẢI trả lời bằng tiếng Việt, tự nhiên và thân thiện.\n" +
  "Sử dụng khối Ngữ cảnh được cung cấp để lấy dữ kiện; KHÔNG bịa thông tin.\n" +
  "Tuyệt đối KHÔNG nhắc tới hay hiển thị các nhãn như [CONTEXT] hoặc nội dung của khối ngữ cảnh trong câu trả lời.\n" +
  "Nếu câu hỏi mơ hồ, KHÔNG yêu cầu xác nhận lại; hãy chủ động tóm tắt ngắn gọn thông tin hữu ích rồi gợi ý hướng hỏi tiếp.\n" +
  "Với câu hỏi mua hàng/thanh toán/giao hàng/theo dõi đơn/đổi trả/hỗ trợ: hướng dẫn quy trình chung (chọn sản phẩm → giỏ hàng → thanh toán → đăng nhập/khách → nhập địa chỉ → chọn phương thức giao → xem phí → xác nhận đơn và nhận email). Không bịa chính sách/giá/số điện thoại nếu chưa có trong Ngữ cảnh.\n" +
  "Nếu không tìm thấy câu trả lời trong Ngữ cảnh: \"Tôi không tìm thấy thông tin này, bạn có thể hỏi câu khác được không?\"";

function vnd(amount: unknown): string {
  const n = Number(amount);
  if (isNaN(n)) return String(amount);
  return `${n.toLocaleString("vi-VN").replace(/,/g, ".")} đ`;
}
function normVi(text: string): string {
  return (text ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim().split(/\s+/).join(" ");
}

// Parse explicit key=value params (tech-savvy users).
function parseShippingParams(text: string): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  const raw: Record<string, string> = {};
  for (const m of text.matchAll(/\b([a-z_]+)\s*=\s*([\w-]+)\b/gi)) raw[m[1].toLowerCase()] = m[2];
  const map: Record<string, string[]> = {
    to_district_id: ["to_district_id", "district_id"], to_ward_code: ["to_ward_code", "ward_code"],
    service_type_id: ["service_type_id", "service"], weight: ["weight", "can_nang"],
    length: ["length"], width: ["width"], height: ["height"], insurance_value: ["insurance_value", "bao_hiem"],
  };
  for (const [key, keys] of Object.entries(map)) {
    for (const k of keys) if (k in raw) { out[key] = raw[k]; break; }
  }
  for (const k of ["to_district_id", "service_type_id", "weight", "length", "width", "height", "insurance_value"]) {
    if (k in out) { const n = parseInt(String(out[k]), 10); if (!isNaN(n)) out[k] = n; }
  }
  return out;
}

type Ctx = Record<string, unknown>;

async function extractLocation(ctx: Ctx, text: string): Promise<Ctx> {
  const norm = normVi(text);
  if (!ctx.province_id) {
    const prov = await findProvince(norm);
    if (prov) { ctx.province_id = prov.ProvinceID; ctx.province = prov.ProvinceName; }
  }
  if (ctx.province_id && !ctx.district_id) {
    const q = norm.replace(normVi(String(ctx.province ?? "")), "").trim() || norm;
    const dist = await findDistrict(Number(ctx.province_id), q);
    if (dist) { ctx.district_id = dist.DistrictID; ctx.district = dist.DistrictName; }
  }
  if (ctx.district_id && !ctx.to_ward_code) {
    const q = norm.replace(normVi(String(ctx.district ?? "")), "").trim() || norm;
    const ward = await findWard(Number(ctx.district_id), q);
    if (ward) { ctx.to_ward_code = ward.WardCode; ctx.ward = ward.WardName; }
  }
  if (ctx.district_id) ctx.to_district_id = ctx.district_id;
  return ctx;
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { detail: "Method not allowed" }, 405);

  let body: { message?: string; session_id?: string };
  try { body = await req.json(); } catch { return json(req, { detail: "Invalid JSON body" }, 400); }
  const question = (body.message ?? "").trim();
  if (!question) return json(req, { detail: "Message is required" }, 400);

  const supabase = serviceClient();
  const sessionId = body.session_id || crypto.randomUUID();

  // Load session state.
  const { data: session } = await supabase
    .from("chat_sessions").select("history, shipping_ctx").eq("session_id", sessionId).maybeSingle();
  let history: Array<{ role: string; content: string }> = session?.history ?? [];
  let shippingCtx: Ctx = session?.shipping_ctx ?? {};

  const qLower = question.toLowerCase();

  // ── Build catalog context from Postgres (keyword search; pgvector upgrade TODO) ──
  let contextText = "";
  const contextLines: string[] = [];
  let books: Array<Record<string, unknown>> = [];
  if (qLower.includes("giảm giá")) {
    books = (await supabase.from("books").select("title, price, discounted_price, stock_quantity, brief_description")
      .eq("is_discount", true).limit(10)).data ?? [];
  } else {
    const tokens = question.split(/\s+/).filter((t) => t.length >= 2).slice(0, 6);
    if (tokens.length) {
      const orFilter = tokens.map((t) => `title.ilike.%${t.replace(/[%,()]/g, "")}%`).join(",");
      books = (await supabase.from("books")
        .select("title, price, discounted_price, stock_quantity, brief_description")
        .or(orFilter).limit(5)).data ?? [];
    }
  }
  if (books.length) {
    contextLines.push("Dưới đây là dữ liệu sách từ cơ sở dữ liệu:");
    for (const b of books) {
      contextLines.push(`- Sách: ${b.title}, Giá: ${b.price}, Giá giảm: ${b.discounted_price}, Tồn kho: ${b.stock_quantity}, Mô tả: ${b.brief_description ?? ""}`);
    }
  }
  // Stationery + available listings + shop summary.
  const stationery = (await supabase.from("stationery").select("title, price, discounted_price, stock_quantity").limit(50)).data ?? [];
  if (stationery.length) {
    contextLines.push("", "Dữ liệu văn phòng phẩm/dụng cụ yoga:");
    for (const s of stationery) contextLines.push(`- Sản phẩm: ${s.title}, Giá: ${s.price}, Giá giảm: ${s.discounted_price}, Tồn kho: ${s.stock_quantity}`);
  }
  const cats = (await supabase.from("categories").select("name").limit(200)).data ?? [];
  const bookTitles = (await supabase.from("books").select("title").limit(100)).data ?? [];
  if (cats.length) contextLines.push("", `Danh mục khả dụng: ${cats.map((c) => c.name).join(", ")}`);
  if (bookTitles.length) contextLines.push(`Tiêu đề sách khả dụng: ${bookTitles.map((b) => b.title).join(", ")}`);
  contextLines.push("Cửa hàng Tâm Nguồn chuyên bán: Sách (tâm linh, phát triển bản thân, yoga), Văn phòng phẩm, Dụng cụ tập yoga, và các sản phẩm tâm linh khác.");
  contextText = contextLines.join("\n").trim() || "Không tìm thấy sản phẩm nào liên quan.";

  // ── Shipping-fee intent ──
  const shippingKw = ["phí vận chuyển", "tiền ship", "phí ship", "shipping fee", "ship"];
  const intent = shippingKw.some((k) => qLower.includes(k));
  if (intent || shippingCtx.intent_active) {
    if (!ghnConfigured()) {
      return json(req, { response: "Hệ thống GHN chưa cấu hình. Vui lòng thử lại sau.", session_id: sessionId });
    }
    shippingCtx.intent_active = true;
    Object.assign(shippingCtx, parseShippingParams(question));
    shippingCtx = await extractLocation(shippingCtx, question);
    const qm = question.match(/(\d+)\s*(cuon|quyen|quyển|cuốn)?/i);
    if (qm) shippingCtx.quantity = parseInt(qm[1], 10);

    let response: string;
    if (shippingCtx.to_district_id && shippingCtx.to_ward_code) {
      const fee = await calculateShippingFee({
        to_district_id: Number(shippingCtx.to_district_id),
        to_ward_code: String(shippingCtx.to_ward_code),
        service_type_id: Number(shippingCtx.service_type_id ?? 2),
        weight: Number(shippingCtx.weight ?? 500),
        length: Number(shippingCtx.length ?? 20),
        width: Number(shippingCtx.width ?? 15),
        height: Number(shippingCtx.height ?? 10),
        insurance_value: Number(shippingCtx.insurance_value ?? 0),
      });
      if (fee) {
        const loc = [shippingCtx.ward, shippingCtx.district, shippingCtx.province].filter(Boolean).join(", ") || "địa chỉ của bạn";
        const qty = shippingCtx.quantity ? ` cho ${shippingCtx.quantity} cuốn` : "";
        response = `Phí vận chuyển dự kiến đến ${loc}${qty}: ${vnd(fee.total)} (phí dịch vụ: ${vnd(fee.service_fee)}, phí bảo hiểm: ${vnd(fee.insurance_fee ?? 0)}). Bạn có thể tiếp tục thanh toán để xác nhận mức phí ở bước giao hàng.`;
        shippingCtx = {}; // clear intent after success
      } else {
        response = "Không tính được phí lúc này, bạn vui lòng thử lại sau.";
      }
    } else {
      const missing: string[] = [];
      if (!shippingCtx.province_id) missing.push("tỉnh/thành");
      else if (!shippingCtx.district_id) missing.push("quận/huyện");
      else if (!shippingCtx.to_ward_code) missing.push("phường/xã");
      const askLoc = missing.length ? missing.join("; ") : "tỉnh/thành, quận/huyện, phường/xã";
      response = `Bạn vui lòng cho mình biết ${askLoc}? Nếu có cân nặng/kích thước ước tính của kiện hàng thì càng tốt.`;
    }
    history = [...history, { role: "user", content: question }, { role: "assistant", content: response }].slice(-20);
    await supabase.from("chat_sessions").upsert({ session_id: sessionId, history, shipping_ctx: shippingCtx });
    return json(req, { response, session_id: sessionId });
  }

  // ── Groq answer ──
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    return json(req, { response: contextText || "Tôi không tìm thấy thông tin này, bạn có thể hỏi câu khác được không?", session_id: sessionId });
  }

  const userPrompt =
    `Ngữ cảnh tham khảo:\n${contextText}\n\n` +
    `Dựa *chỉ* trên Ngữ cảnh ở trên, hãy trả lời câu hỏi sau (tự nhiên, không nhắc tới ngữ cảnh):\n${question}`;
  const messages = [
    { role: "system", content: STRICT_SYSTEM_PROMPT },
    ...history.slice(-10).filter((m) => (m.role === "user" || m.role === "assistant") && m.content),
    { role: "user", content: userPrompt },
  ];

  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", temperature: 0.1, messages }),
    });
    if (!resp.ok) {
      console.error("Groq chat HTTP", resp.status, await resp.text());
      return json(req, { response: "Đã có lỗi xảy ra, vui lòng thử lại.", session_id: sessionId });
    }
    const data = await resp.json();
    let answer = (data?.choices?.[0]?.message?.content ?? "").replace(/\[\/?CONTEXT\]/gi, "").trim();
    if (!answer) answer = "Tôi không tìm thấy thông tin này, bạn có thể hỏi câu khác được không?";
    history = [...history, { role: "user", content: question }, { role: "assistant", content: answer }].slice(-20);
    await supabase.from("chat_sessions").upsert({ session_id: sessionId, history, shipping_ctx: shippingCtx });
    return json(req, { response: answer, session_id: sessionId });
  } catch (e) {
    console.error("Groq chat error", e);
    return json(req, { response: "Đã có lỗi xảy ra, vui lòng thử lại.", session_id: sessionId });
  }
});
