// Edge Function: import-books
// Replaces FastAPI `POST /books/import-xlsx` (app/routers/import_books.py).
//
// Accepts multipart/form-data with field `file` (an .xlsx/.xls). Parses rows,
// auto-creates authors/categories, inserts books (skipping duplicate ISBN/slug),
// and returns a summary. Admin only.
//
// XLSX parsing via SheetJS (esm.sh). Secrets: SUPABASE_* injected.
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient, userClient } from "../_shared/supabase.ts";

function slugify(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ParsedFeatures {
  author?: string; publisher?: string; pages?: number;
  height?: number; width?: number; translator?: string;
}

function parseFeatures(s: string): ParsedFeatures {
  const r: ParsedFeatures = {};
  if (!s) return r;
  const author = s.match(/Tác giả:\s*\w\[([^\]]+)\]/);
  if (author) r.author = author[1].trim();
  const translator = s.match(/Dịch giả:\s*\w\[([^\]]+)\]/);
  if (translator) r.translator = translator[1].trim();
  const publisher = s.match(/Nhà Xuất Bản:\s*\w\[([^\]]+)\]/);
  if (publisher) r.publisher = publisher[1].trim();
  const pages = s.match(/Số trang:\s*\w\[([^\]]+)\]/);
  if (pages) { const n = parseInt(pages[1].trim(), 10); if (!isNaN(n)) r.pages = n; }
  const dim = s.match(/Kích thước:\s*\w\[([^\]]+)\]/);
  if (dim) {
    const parts = dim[1].trim().split(/\s*x\s*/);
    if (parts.length >= 2) {
      const w = parseFloat(parts[0]); const h = parseFloat(parts[1]);
      if (!isNaN(w)) r.width = w;
      if (!isNaN(h)) r.height = h;
    }
  }
  return r;
}

function parseCategory(s: string): string | null {
  if (!s) return null;
  const segments = s.split("///");
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i].trim();
    if (seg) return seg;
  }
  return null;
}

const EXPECTED: Record<string, string> = {
  "isbn": "isbn", "product name": "product_name", "category": "category",
  "price": "price", "weight": "weight", "features": "features",
  "list price": "list_price", "mô tả": "description",
};

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, { detail: "Method not allowed" }, 405);

  const supabase = serviceClient();

  // Admin gate.
  const { data: { user } } = await userClient(req).auth.getUser();
  if (!user) return json(req, { detail: "Not authenticated" }, 401);
  const { data: caller } = await supabase
    .from("users").select("role:roles(role_name)").eq("auth_id", user.id).maybeSingle();
  if (caller?.role?.role_name !== "Admin") return json(req, { detail: "Admin only" }, 403);

  // Read the uploaded file.
  let file: File | null = null;
  try {
    const form = await req.formData();
    file = form.get("file") as File | null;
  } catch {
    return json(req, { detail: "Expected multipart/form-data with a 'file' field" }, 400);
  }
  if (!file || !/\.(xlsx|xls)$/i.test(file.name)) {
    return json(req, { detail: "File must be an Excel file (.xlsx or .xls)" }, 400);
  }

  const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // rows as arrays; row 0 = headers.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  if (rows.length < 2) return json(req, { detail: "Empty spreadsheet" }, 400);

  const headers = (rows[0] as unknown[]).map((h) => String(h ?? "").trim().toLowerCase());
  const colMap: Record<string, number> = {};
  headers.forEach((h, idx) => { if (EXPECTED[h]) colMap[EXPECTED[h]] = idx; });
  if (colMap.product_name === undefined) {
    return json(req, { detail: `Missing required column 'Product name'. Found: ${headers.join(", ")}` }, 400);
  }

  // Preload existing isbns + slugs, and author/category name→id caches.
  const existingIsbns = new Set<string>();
  const existingSlugs = new Set<string>();
  for (const b of (await supabase.from("books").select("isbn, slug")).data ?? []) {
    if (b.isbn) existingIsbns.add(String(b.isbn).trim());
    if (b.slug) existingSlugs.add(b.slug);
  }
  const authorCache = new Map<string, number>();
  for (const a of (await supabase.from("authors").select("author_id, name")).data ?? []) {
    authorCache.set(a.name, a.author_id);
  }
  const categoryCache = new Map<string, number>();
  for (const c of (await supabase.from("categories").select("category_id, name")).data ?? []) {
    categoryCache.set(c.name, c.category_id);
  }

  async function getOrCreateAuthor(name: string): Promise<number | null> {
    if (!name) return null;
    if (authorCache.has(name)) return authorCache.get(name)!;
    const { data } = await supabase.from("authors").insert({ name }).select("author_id").single();
    if (data) { authorCache.set(name, data.author_id); return data.author_id; }
    return null;
  }
  async function getOrCreateCategory(name: string): Promise<number | null> {
    if (!name) return null;
    if (categoryCache.has(name)) return categoryCache.get(name)!;
    const { data } = await supabase.from("categories").insert({ name }).select("category_id").single();
    if (data) { categoryCache.set(name, data.category_id); return data.category_id; }
    return null;
  }

  const num = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = parseFloat(String(v).replace(/,/g, "").trim());
    return isNaN(n) ? null : Math.trunc(n);
  };

  let created = 0, skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const get = (key: string) => (colMap[key] === undefined ? null : row[colMap[key]]);
    try {
      const titleRaw = get("product_name");
      if (!titleRaw) continue;
      const title = String(titleRaw).trim();

      let isbn = String(get("isbn") ?? "").trim();
      if (isbn.length > 13) {
        const digits = isbn.replace(/[^0-9]/g, "");
        isbn = digits ? digits.slice(0, 13) : isbn.slice(0, 13);
      }
      if (isbn && existingIsbns.has(isbn)) { skipped++; continue; }

      const price = num(get("price")) ?? 0;
      const weight = num(get("weight"));
      const description = String(get("description") ?? "").trim() || null;
      const features = parseFeatures(String(get("features") ?? ""));
      const categoryName = parseCategory(String(get("category") ?? ""));

      let slug = slugify(title);
      if (existingSlugs.has(slug)) slug = slugify(isbn ? `${slug}-${isbn}` : `${slug}-${i + 1}`);
      if (existingSlugs.has(slug)) { skipped++; errors.push(`Row ${i + 1}: Duplicate slug for '${title.slice(0, 50)}'`); continue; }

      const { data: book, error: bookErr } = await supabase.from("books").insert({
        title, slug, isbn: isbn || null, price, stock_quantity: 0,
        full_description: description, weight,
        pages: features.pages ?? null, height: features.height ?? null, width: features.width ?? null,
        publisher: features.publisher ?? null, is_active: true,
      }).select("book_id").single();
      if (bookErr || !book) { errors.push(`Row ${i + 1}: ${bookErr?.message ?? "insert failed"}`); continue; }

      if (features.author) {
        const aid = await getOrCreateAuthor(features.author);
        if (aid) await supabase.from("book_authors").insert({ book_id: book.book_id, author_id: aid });
      }
      if (categoryName) {
        const cid = await getOrCreateCategory(categoryName);
        if (cid) await supabase.from("book_categories").insert({ book_id: book.book_id, category_id: cid });
      }

      if (isbn) existingIsbns.add(isbn);
      existingSlugs.add(slug);
      created++;
    } catch (e) {
      errors.push(`Row ${i + 1}: ${String(e).slice(0, 100)}`);
    }
  }

  return json(req, {
    message: "Import completed successfully",
    created, skipped, total_errors: errors.length, errors: errors.slice(0, 50),
  });
});
