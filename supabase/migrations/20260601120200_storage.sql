-- =============================================================================
-- Storage buckets — replace the local `static/images/...` filesystem served by
-- FastAPI's StaticFiles + image_service.py / media_service.py.
--
--   product-images  : public, 5 MB, images (book/stationery covers, slides...)
--   read-samples    : public, 5 MB, PDF/image reading samples
--   audio-samples   : public, 50 MB, audio previews
--
-- Image resizing/WebP conversion (old image_service.create_optimized_versions)
-- is handled at read time by Supabase Storage image transformations, or in the
-- upload Edge Function — see supabase/MIGRATION.md.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('product-images', 'product-images', true, 5242880,
        array['image/jpeg','image/png','image/webp']),
    ('read-samples', 'read-samples', true, 5242880,
        array['image/jpeg','image/png','image/webp','application/pdf']),
    ('audio-samples', 'audio-samples', true, 52428800,
        array['audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/aac','audio/x-m4a'])
on conflict (id) do nothing;

-- Public read for all three buckets.
create policy "public read product-images" on storage.objects
    for select using (bucket_id = 'product-images');
create policy "public read read-samples" on storage.objects
    for select using (bucket_id = 'read-samples');
create policy "public read audio-samples" on storage.objects
    for select using (bucket_id = 'audio-samples');

-- Only admins may write/delete (uploads otherwise go through service_role).
create policy "admin write product-images" on storage.objects
    for all using (bucket_id = 'product-images' and public.is_admin())
    with check (bucket_id = 'product-images' and public.is_admin());
create policy "admin write read-samples" on storage.objects
    for all using (bucket_id = 'read-samples' and public.is_admin())
    with check (bucket_id = 'read-samples' and public.is_admin());
create policy "admin write audio-samples" on storage.objects
    for all using (bucket_id = 'audio-samples' and public.is_admin())
    with check (bucket_id = 'audio-samples' and public.is_admin());
