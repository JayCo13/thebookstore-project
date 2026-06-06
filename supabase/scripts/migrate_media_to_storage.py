#!/usr/bin/env python3
"""
Migrate media files from the VPS (FastAPI /static) into Supabase Storage and
rewrite the DB URLs. Run AFTER the data import, BEFORE decommissioning the VPS.

What it migrates:
  books.image_url / image2_url / image3_url   -> bucket `product-images`
  books.read_sample (JSON array of paths)      -> bucket `read-samples`
  books.audio_sample                           -> bucket `audio-samples`
  stationery.image_url / image2_url / image3_url -> bucket `product-images`

For each value still pointing at the old `/static/...` path it:
  1. downloads it from LEGACY_STATIC_BASE,
  2. uploads it to the right bucket (upsert),
  3. rewrites the DB column to the new Supabase public URL.

Idempotent: values that are already absolute http(s) URLs are skipped, so it is
safe to re-run (e.g. after adding more products).

Usage:
    pip install requests
    export SUPABASE_URL='https://npqywguqbcqlkumbfnng.supabase.co'
    export SUPABASE_SERVICE_ROLE_KEY='<service_role JWT>'   # Settings -> API
    export LEGACY_STATIC_BASE='https://api.tamnguon.com'    # the VPS, default
    # optional dry run (no upload/DB change), just report:
    #   export DRY_RUN=1
    python supabase/scripts/migrate_media_to_storage.py
"""
import os
import sys
import json
import mimetypes
from urllib.parse import quote

try:
    import requests
except ImportError:
    print("pip install requests", file=sys.stderr)
    raise SystemExit(1)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
LEGACY = os.environ.get("LEGACY_STATIC_BASE", "https://api.tamnguon.com").rstrip("/")
DRY_RUN = os.environ.get("DRY_RUN") in ("1", "true", "yes")

if not SUPABASE_URL or not SERVICE_KEY:
    print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
    raise SystemExit(1)

H = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}

stats = {"uploaded": 0, "skipped_already_url": 0, "missing_on_vps": 0, "errors": 0, "rows_updated": 0}


def bucket_for(path: str) -> str:
    p = path.lower()
    if "/read_samples/" in p or "read_sample" in p:
        return "read-samples"
    if "/audio_samples/" in p or "audio_sample" in p or p.endswith((".mp3", ".wav", ".ogg", ".m4a", ".aac")):
        return "audio-samples"
    return "product-images"


def object_path(path: str) -> str:
    # Strip leading /static/ and keep the rest as the storage object path.
    rel = path.split("/static/", 1)[-1].lstrip("/")
    return rel or path.lstrip("/")


def public_url(bucket: str, obj: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/{bucket}/{quote(obj)}"


def migrate_value(val: str) -> str:
    """Migrate one path → returns the new public URL (or the value unchanged)."""
    if not val or not isinstance(val, str):
        return val
    if val.startswith("http://") or val.startswith("https://"):
        stats["skipped_already_url"] += 1
        return val  # already migrated / external

    src = f"{LEGACY}{val if val.startswith('/') else '/static/' + val}"
    bucket = bucket_for(val)
    obj = object_path(val)

    try:
        r = requests.get(src, timeout=60)
    except Exception as e:
        print(f"  ! download error {src}: {e}")
        stats["errors"] += 1
        return val
    if r.status_code != 200 or not r.content:
        print(f"  ! missing on VPS ({r.status_code}): {src}")
        stats["missing_on_vps"] += 1
        return val

    # The VPS sometimes serves a wrong Content-Type (e.g. text/plain for .m4a),
    # which Storage rejects. Prefer the extension; ignore text/* header values.
    ext_mime = {".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav",
                ".ogg": "audio/ogg", ".aac": "audio/aac", ".webp": "image/webp",
                ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".pdf": "application/pdf"}
    ext = os.path.splitext(obj)[1].lower()
    hdr = r.headers.get("Content-Type")
    ctype = (ext_mime.get(ext) or mimetypes.guess_type(obj)[0]
             or (hdr if hdr and not hdr.startswith("text/") else None)
             or "application/octet-stream")
    if DRY_RUN:
        print(f"  [dry-run] would upload {src} -> {bucket}/{obj} ({len(r.content)} bytes)")
        stats["uploaded"] += 1
        return public_url(bucket, obj)

    up = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{bucket}/{quote(obj)}",
        headers={**H, "Content-Type": ctype, "x-upsert": "true"},
        data=r.content, timeout=120,
    )
    if up.status_code not in (200, 201):
        print(f"  ! upload failed {bucket}/{obj}: {up.status_code} {up.text[:160]}")
        stats["errors"] += 1
        return val
    stats["uploaded"] += 1
    new_url = public_url(bucket, obj)
    print(f"  ✓ {val}  ->  {bucket}/{obj}")
    return new_url


def migrate_read_sample(val):
    """read_sample is a JSON string array of paths."""
    if not val:
        return val
    try:
        arr = json.loads(val) if isinstance(val, str) else val
    except Exception:
        arr = [val]
    if not isinstance(arr, list) or not arr:
        return val
    new_arr = [migrate_value(p) for p in arr]
    return json.dumps(new_arr)


def patch_row(table: str, id_col: str, id_val, fields: dict):
    if DRY_RUN or not fields:
        return
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{table}?{id_col}=eq.{id_val}",
        headers={**H, "Content-Type": "application/json", "Prefer": "return=minimal"},
        json=fields, timeout=60,
    )
    if r.status_code in (200, 204):
        stats["rows_updated"] += 1
    else:
        print(f"  ! DB update failed {table}#{id_val}: {r.status_code} {r.text[:160]}")
        stats["errors"] += 1


def run():
    # ---- books ----
    print("== books ==")
    books = requests.get(
        f"{SUPABASE_URL}/rest/v1/books"
        f"?select=book_id,image_url,image2_url,image3_url,read_sample,audio_sample",
        headers=H, timeout=120).json()
    for b in books:
        fields = {}
        for col in ("image_url", "image2_url", "image3_url"):
            nv = migrate_value(b.get(col))
            if nv != b.get(col):
                fields[col] = nv
        rs = migrate_read_sample(b.get("read_sample"))
        if rs != b.get("read_sample"):
            fields["read_sample"] = rs
        au = migrate_value(b.get("audio_sample"))
        if au != b.get("audio_sample"):
            fields["audio_sample"] = au
        if fields:
            patch_row("books", "book_id", b["book_id"], fields)

    # ---- stationery ----
    print("== stationery ==")
    st = requests.get(
        f"{SUPABASE_URL}/rest/v1/stationery?select=stationery_id,image_url,image2_url,image3_url",
        headers=H, timeout=120).json()
    for s in st:
        fields = {}
        for col in ("image_url", "image2_url", "image3_url"):
            nv = migrate_value(s.get(col))
            if nv != s.get(col):
                fields[col] = nv
        if fields:
            patch_row("stationery", "stationery_id", s["stationery_id"], fields)

    print("\n=== DONE ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    if DRY_RUN:
        print("  (DRY_RUN — nothing was uploaded or changed)")


if __name__ == "__main__":
    run()
