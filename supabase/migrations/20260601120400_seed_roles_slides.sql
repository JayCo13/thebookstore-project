-- =============================================================================
-- Baseline seed applied as a MIGRATION (so `supabase db push` runs it on the
-- cloud project — seed.sql only runs on local `db reset`). Idempotent.
-- Mirrors FastAPI init_roles() + the 3 default homepage slides.
--
-- The admin USER is still created manually after deploy (it needs auth.users
-- credentials) — see supabase/MIGRATION.md "Admin user".
-- =============================================================================

insert into public.roles (role_name) values ('Admin'), ('Customer')
on conflict (role_name) do nothing;

insert into public.slide_contents (slide_number)
select n from (values (1), (2), (3)) as s(n)
where not exists (select 1 from public.slide_contents sc where sc.slide_number = s.n);
