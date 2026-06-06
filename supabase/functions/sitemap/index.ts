// Edge Function: sitemap
// Replaces FastAPI `GET /sitemap.xml` (app/routers/seo.py).
// Generates sitemap.xml from active books/stationery + static routes.
//
// Env: FRONTEND_URL (e.g. https://tamnguon.com). Public (deploy --no-verify-jwt).
import { serviceClient } from "../_shared/supabase.ts";

const SITE = (Deno.env.get("FRONTEND_URL") ?? "https://tamnguon.com").replace(/\/$/, "");
const STATIC_PATHS = ["", "/books", "/van-phong-pham", "/about", "/contact", "/cau-hoi-thuong-gap"];

function urlEntry(loc: string, changefreq = "weekly", priority = "0.7"): string {
  return `  <url><loc>${loc}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }
  const supabase = serviceClient();
  const entries: string[] = STATIC_PATHS.map((p) => urlEntry(`${SITE}${p}`, "daily", p === "" ? "1.0" : "0.8"));

  const { data: books } = await supabase
    .from("books").select("slug").eq("is_active", true).not("slug", "is", null);
  for (const b of books ?? []) entries.push(urlEntry(`${SITE}/sach/${b.slug}`, "weekly", "0.6"));

  const { data: stationery } = await supabase
    .from("stationery").select("slug").eq("is_active", true).not("slug", "is", null);
  for (const s of stationery ?? []) entries.push(urlEntry(`${SITE}/van-phong-pham/${s.slug}`, "weekly", "0.6"));

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
