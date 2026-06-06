-- =============================================================================
-- LOCAL-ONLY seed (runs on `supabase db reset`, which needs Docker).
-- For the CLOUD project, the same data is applied by migration
-- 20260601120400_seed_roles_slides.sql via `supabase db push` — so you do NOT
-- need this file or Docker to go live.
-- The admin USER is created separately (see supabase/MIGRATION.md "Admin user").
-- =============================================================================

insert into public.roles (role_name) values ('Admin'), ('Customer')
on conflict (role_name) do nothing;

-- Three empty hero slides (slides router auto-created these on first access).
insert into public.slide_contents (slide_number) values (1), (2), (3)
on conflict do nothing;
