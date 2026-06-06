-- =============================================================================
-- Row Level Security + auth bridge.
--
-- This replaces the FastAPI dependency gates:
--   * get_current_user / get_current_active_user  -> auth.uid() is not null
--   * require_admin                               -> public.is_admin()
--   * require_customer_or_admin                    -> authenticated + RLS scoping
--   * per-user isolation (addresses/orders/etc.)   -> public.app_user_id() match
--
-- Model:
--   - anon / authenticated clients hit Postgres through PostgREST (supabase-js)
--     and are constrained by the policies below.
--   - Edge Functions that need to bypass RLS (order creation with GHN/PayOS,
--     webhooks, admin code issuance) use the service_role key, which is exempt
--     from RLS entirely — so those flows are NOT re-encoded as policies here.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Auth helper functions (SECURITY DEFINER so they can read public.users under RLS)
-- ---------------------------------------------------------------------------

-- Integer app user_id for the currently authenticated Supabase user, or null.
create or replace function public.app_user_id()
returns int
language sql
stable
security definer
set search_path = public
as $$
    select u.user_id
    from public.users u
    where u.auth_id = auth.uid()
    limit 1;
$$;

-- True when the current user maps to a row whose role is 'Admin'.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.users u
        join public.roles r on r.role_id = u.role_id
        where u.auth_id = auth.uid()
          and r.role_name = 'Admin'
    );
$$;

revoke all on function public.app_user_id() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.app_user_id() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- New-signup bridge: when Supabase Auth creates an auth.users row, mirror it
-- into public.users (Customer role) so app code keeps working off integer ids.
-- If a legacy row already exists for that email, just link it instead.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    customer_role_id int;
    existing_id      int;
begin
    select role_id into customer_role_id
    from public.roles where role_name = 'Customer' limit 1;

    -- Link a pre-existing legacy row (migrated MySQL data) by email.
    select user_id into existing_id
    from public.users where lower(email) = lower(new.email) limit 1;

    if existing_id is not null then
        update public.users
           set auth_id = new.id,
               is_active = 1
         where user_id = existing_id;
        return new;
    end if;

    insert into public.users (role_id, auth_id, first_name, last_name, email,
                              is_active, auth_provider)
    values (
        coalesce(customer_role_id, 2),
        new.id,
        coalesce(new.raw_user_meta_data->>'first_name', ''),
        coalesce(new.raw_user_meta_data->>'last_name', ''),
        new.email,
        case when new.email_confirmed_at is not null then 1 else 0 end,
        coalesce(new.raw_app_meta_data->>'provider', 'local')
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_auth_user();

-- Keep is_active in sync when email gets confirmed.
create or replace function public.handle_auth_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.email_confirmed_at is not null and (old.email_confirmed_at is null) then
        update public.users set is_active = 1 where auth_id = new.id;
    end if;
    return new;
end;
$$;

create trigger on_auth_user_confirmed
    after update on auth.users
    for each row execute function public.handle_auth_user_confirmed();

-- ===========================================================================
-- Enable RLS on every public table.
-- ===========================================================================
alter table public.roles                 enable row level security;
alter table public.users                 enable row level security;
alter table public.addresses             enable row level security;
alter table public.authors               enable row level security;
alter table public.categories            enable row level security;
alter table public.books                 enable row level security;
alter table public.stationery            enable row level security;
alter table public.book_authors          enable row level security;
alter table public.book_categories       enable row level security;
alter table public.stationery_categories enable row level security;
alter table public.reviews               enable row level security;
alter table public.stationery_reviews    enable row level security;
alter table public.wishlists             enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.slide_contents        enable row level security;
alter table public.notifications         enable row level security;
alter table public.admin_login_codes     enable row level security;

-- ---------------------------------------------------------------------------
-- Public catalog: world-readable, admin-writable.
-- ---------------------------------------------------------------------------
create policy "catalog read" on public.books         for select using (true);
create policy "catalog read" on public.stationery    for select using (true);
create policy "catalog read" on public.authors       for select using (true);
create policy "catalog read" on public.categories    for select using (true);
create policy "catalog read" on public.book_authors  for select using (true);
create policy "catalog read" on public.book_categories for select using (true);
create policy "catalog read" on public.stationery_categories for select using (true);
create policy "catalog read" on public.slide_contents for select using (true);

create policy "admin write" on public.books         for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.stationery    for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.authors       for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.categories    for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.book_authors  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.book_categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.stationery_categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admin write" on public.slide_contents for all using (public.is_admin()) with check (public.is_admin());

-- Notifications: only active ones are public; admins manage all.
create policy "active notifications read" on public.notifications
    for select using (is_active or public.is_admin());
create policy "admin write" on public.notifications
    for all using (public.is_admin()) with check (public.is_admin());

-- Roles: readable by anyone (small lookup); writable by admin only.
create policy "roles read" on public.roles for select using (true);
create policy "admin write" on public.roles for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Users: each user sees/updates their own row; admins see all.
-- ---------------------------------------------------------------------------
create policy "own user read" on public.users
    for select using (auth_id = auth.uid() or public.is_admin());
create policy "own user update" on public.users
    for update using (auth_id = auth.uid()) with check (auth_id = auth.uid());
create policy "admin manage users" on public.users
    for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Addresses: strictly owner-scoped.
-- ---------------------------------------------------------------------------
create policy "own addresses" on public.addresses
    for all using (user_id = public.app_user_id())
    with check (user_id = public.app_user_id());

-- ---------------------------------------------------------------------------
-- Reviews: world-readable, owner-writable, admin-moderatable.
-- ---------------------------------------------------------------------------
create policy "reviews read" on public.reviews for select using (true);
create policy "own reviews write" on public.reviews
    for all using (user_id = public.app_user_id() or public.is_admin())
    with check (user_id = public.app_user_id() or public.is_admin());

create policy "stationery reviews read" on public.stationery_reviews for select using (true);
create policy "own stationery reviews write" on public.stationery_reviews
    for all using (user_id = public.app_user_id() or public.is_admin())
    with check (user_id = public.app_user_id() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Wishlist: owner-scoped.
-- ---------------------------------------------------------------------------
create policy "own wishlist" on public.wishlists
    for all using (user_id = public.app_user_id())
    with check (user_id = public.app_user_id());

-- ---------------------------------------------------------------------------
-- Orders: owner can read their own; admins read/manage all.
-- Creation of orders runs through an Edge Function (service_role) because it
-- needs GHN/PayOS side effects + guest orders, so no client INSERT policy here.
-- ---------------------------------------------------------------------------
create policy "own orders read" on public.orders
    for select using (user_id = public.app_user_id() or public.is_admin());
create policy "admin manage orders" on public.orders
    for all using (public.is_admin()) with check (public.is_admin());

create policy "own order items read" on public.order_items
    for select using (
        public.is_admin()
        or exists (
            select 1 from public.orders o
            where o.order_id = order_items.order_id
              and o.user_id = public.app_user_id()
        )
    );
create policy "admin manage order items" on public.order_items
    for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Admin-only / secret tables: no anon or authenticated access at all.
-- (service_role bypasses RLS; these stay locked to everyone else.)
-- ---------------------------------------------------------------------------
create policy "admin only" on public.admin_login_codes
    for all using (public.is_admin()) with check (public.is_admin());
