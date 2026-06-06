// Edge Function: moderate-review
// Replaces FastAPI `POST /moderation/review` (app/routers/moderation.py).
//
// Stateless Groq call: takes review text, returns { approved, flags, severity,
// reason }. Vietnamese-first system prompt preserved verbatim from the original.
//
// Secret: GROQ_API_KEY_MOD (preferred) or GROQ_API_KEY.
//   supabase secrets set GROQ_API_KEY_MOD=...
import { handleOptions, json } from "../_shared/cors.ts";

const SYSTEM_PROMPT =
  "Bạn là hệ thống kiểm duyệt nội dung bình luận sản phẩm. " +
  "Nhiệm vụ: đánh giá văn bản có chứa từ ngữ thô tục, thù hằn, tình dục, miệt thị, xúc phạm rõ ràng, spam, hoặc vi phạm chính sách khác. " +
  "Xem xét cả tiếng Việt và tiếng Anh (bao gồm các cách viết thiếu dấu/biến đổi, leetspeak). " +
  "YÊU CẦU: Trả về CHỈ JSON thô, không markdown, không backticks, không chú thích. " +
  "Trường JSON: approved (boolean), flags (mảng chuỗi ngắn), severity (low|medium|high), reason (tóm tắt ngắn). " +
  "Hãy viết trường 'reason' bằng TIẾNG VIỆT. Nếu có thể, dùng tiếng Việt cho các phần tử trong 'flags'. " +
  "Nếu là trường hợp ranh giới/nhẹ, đặt severity='low' và approved=true; nếu vi phạm rõ ràng, đặt approved=false.";

// Robust JSON extraction — mirrors _extract_json() in the Python router.
function extractJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const s = text.trim();
  if (s.includes("```")) {
    for (let part of s.split("```")) {
      part = part.trim();
      if (part.toLowerCase().startsWith("json")) part = part.slice(4).trim();
      if (part.startsWith("{") && part.endsWith("}")) {
        try { return JSON.parse(part); } catch { /* keep trying */ }
      }
    }
  }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch { /* fall through */ }
  }
  return null;
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  let payload: { text?: string; rating?: number | null; language?: string | null };
  try {
    payload = await req.json();
  } catch {
    return json(req, { detail: "Invalid JSON body" }, 400);
  }

  if (!payload.text || !payload.text.trim()) {
    return json(req, { detail: "Cần có nội dung đánh giá" }, 400);
  }

  const apiKey = Deno.env.get("GROQ_API_KEY_MOD") ?? Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    return json(req, { detail: "Dịch vụ kiểm duyệt AI không khả dụng" }, 503);
  }

  const userPrompt =
    `Language=${payload.language ?? "auto"}; ` +
    `Rating=${payload.rating ?? "unknown"}; Review Text: ${payload.text}`;

  let content = "{}";
  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.0,
        max_tokens: 256,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!resp.ok) {
      console.error("Groq moderation HTTP", resp.status, await resp.text());
      return json(req, { detail: "Lỗi nhà cung cấp kiểm duyệt" }, 502);
    }
    const body = await resp.json();
    content = body?.choices?.[0]?.message?.content ?? "{}";
  } catch (e) {
    console.error("Groq moderation error", e);
    return json(req, { detail: "Lỗi nhà cung cấp kiểm duyệt" }, 502);
  }

  const data = extractJson(content);
  if (!data) {
    // Conservative fallback, identical to the Python behaviour.
    return json(req, {
      approved: false,
      flags: ["không_thể_phân_tích_phản_hồi"],
      severity: "medium",
      reason: "Không thể phân tích phản hồi kiểm duyệt",
    });
  }

  const flags = Array.isArray(data.flags)
    ? data.flags.map(String)
    : data.flags != null ? [String(data.flags)] : [];

  return json(req, {
    approved: Boolean(data.approved ?? false),
    flags,
    severity: data.severity ?? null,
    reason: data.reason ?? null,
  });
});
