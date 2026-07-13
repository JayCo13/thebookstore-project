// Edge Function: upload-media
// Replaces the FastAPI image/read-sample/audio upload endpoints on books &
// stationery (image_service.py / media_service.py + the /static filesystem).
//
// Uploads to Supabase Storage and writes the resulting public URL back onto the
// product row. Admin only.
//
// Request: multipart/form-data with
//   entity     : "book" | "stationery"
//   entity_id  : number
//   slot       : "image" | "image2" | "image3" | "read-sample" | "audio-sample"
//   file       : the upload (for read-sample, multiple `file` fields allowed)
//
// Buckets (see 20260601120200_storage.sql):
//   image/image2/image3 -> product-images ; read-sample -> read-samples ;
//   audio-sample -> audio-samples.
//
// Note: WebP resizing (old create_optimized_versions) is left to Supabase
// Storage's render/image transformation on read; originals are stored here.
import { handleOptions, json } from "../_shared/cors.ts";
import { serviceClient, userClient } from "../_shared/supabase.ts";

const SLOT_CONFIG: Record<string, { bucket: string; column: string; multiple?: boolean }> = {
  "image": { bucket: "product-images", column: "image_url" },
  "image2": { bucket: "product-images", column: "image2_url" },
  "image3": { bucket: "product-images", column: "image3_url" },
  "read-sample": { bucket: "read-samples", column: "read_sample", multiple: true },
  "audio-sample": { bucket: "audio-samples", column: "audio_sample" },
};

function extOf(name: string): string {
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "bin";
}

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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json(req, { detail: "Expected multipart/form-data" }, 400);
  }

  const entity = String(form.get("entity") ?? "");
  const entityId = Number(form.get("entity_id"));
  const slot = String(form.get("slot") ?? "");
  if (entity !== "book" && entity !== "stationery") {
    return json(req, { detail: "entity must be 'book' or 'stationery'" }, 400);
  }
  if (!entityId) return json(req, { detail: "entity_id required" }, 400);
  const cfg = SLOT_CONFIG[slot];
  if (!cfg) return json(req, { detail: `Invalid slot. One of: ${Object.keys(SLOT_CONFIG).join(", ")}` }, 400);

  const table = entity === "book" ? "books" : "stationery";
  const idCol = entity === "book" ? "book_id" : "stationery_id";

  // read_sample / audio_sample only exist on books.
  if ((slot === "read-sample" || slot === "audio-sample") && entity !== "book") {
    return json(req, { detail: `${slot} is only supported for books` }, 400);
  }

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) return json(req, { detail: "No file provided" }, 400);

  const publicUrls: string[] = [];
  for (const file of files) {
    const path = `${entityId}/${crypto.randomUUID()}.${extOf(file.name)}`;
    const { error: upErr } = await supabase.storage
      .from(cfg.bucket)
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (upErr) {
      console.error("Storage upload failed", upErr);
      return json(req, { detail: `Upload failed: ${upErr.message}` }, 500);
    }
    // getPublicUrl can return a host-less "/storage/v1/object/public/..." path
    // (observed on some deploys); normalise to an absolute URL so the row never
    // stores a relative path the frontend would resolve against the wrong host.
    let publicUrl = supabase.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl;
    if (publicUrl.startsWith("/")) {
      const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
      publicUrl = base + publicUrl;
    }
    publicUrls.push(publicUrl);
    if (!cfg.multiple) break; // single-slot: only first file
  }

  // Persist onto the row. read-sample stores a JSON array (matches old behaviour).
  const value = cfg.multiple ? JSON.stringify(publicUrls) : publicUrls[0];
  const { error: updErr } = await supabase
    .from(table).update({ [cfg.column]: value }).eq(idCol, entityId);
  if (updErr) {
    console.error("Row update failed", updErr);
    return json(req, { detail: `Failed to update ${entity}: ${updErr.message}` }, 500);
  }

  return json(req, { [cfg.column]: value, urls: publicUrls });
});
