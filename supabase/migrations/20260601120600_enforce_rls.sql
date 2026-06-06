-- =============================================================================
-- ENFORCE RLS (idempotent re-application).
--
-- Diagnosis: on the live project, the RLS enable + policies from
-- 20260601120100 did NOT take effect (anon could read users/admin_login_codes
-- and INSERT rows), even though is_admin()/app_user_id() exist. This re-applies
-- the full security model in a re-runnable way (drop-if-exists guards), plus the
-- auth signup/confirm triggers.
--
-- Safe to run multiple times. Run via Supabase SQL Editor or `supabase db push`.
-- =============================================================================

-- ---- helper functions (create or replace = idempotent) ----------------------
create or replace function public.app_user_id()
returns int language sql stable security definer set search_path = public as $$
    select u.user_id from public.users u where u.auth_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.users u
        join public.roles r on r.role_id = u.role_id
        where u.auth_id = auth.uid() and r.role_name = 'Admin'
    );
$$;

revoke all on function public.app_user_id() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.app_user_id() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;

-- ---- auth signup / confirm bridge -------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    customer_role_id int;
    existing_id      int;
begin
    select role_id into customer_role_id from public.roles where role_name = 'Customer' limit 1;
    select user_id into existing_id from public.users where lower(email) = lower(new.email) limit 1;
    if existing_id is not null then
        update public.users set auth_id = new.id, is_active = 1 where user_id = existing_id;
        return new;
    end if;
    insert into public.users (role_id, auth_id, first_name, last_name, email, is_active, auth_provider)
    values (coalesce(customer_role_id, 2), new.id,
            coalesce(new.raw_user_meta_data->>'first_name', ''),
            coalesce(new.raw_user_meta_data->>'last_name', ''),
            new.email,
            case when new.email_confirmed_at is not null then 1 else 0 end,
            coalesce(new.raw_app_meta_data->>'provider', 'local'));
    return new;
end;
$$;

create or replace function public.handle_auth_user_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if new.email_confirmed_at is not null and (old.email_confirmed_at is null) then
        update public.users set is_active = 1 where auth_id = new.id;
    end if;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_auth_user();

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed after update on auth.users
    for each row execute function public.handle_auth_user_confirmed();

-- ---- enable RLS on every table (idempotent) ---------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'roles','users','addresses','authors','categories','books','stationery',
    'book_authors','book_categories','stationery_categories','reviews',
    'stationery_reviews','wishlists','orders','order_items','slide_contents',
    'notifications','admin_login_codes','chat_sessions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end$$;

-- ---- policies (drop-if-exists then create = re-runnable) --------------------

-- public catalog: world-readable
drop policy if exists "catalog read" on public.books;
create policy "catalog read" on public.books for select using (true);
drop policy if exists "catalog read" on public.stationery;
create policy "catalog read" on public.stationery for select using (true);
drop policy if exists "catalog read" on public.authors;
create policy "catalog read" on public.authors for select using (true);
drop policy if exists "catalog read" on public.categories;
create policy "catalog read" on public.categories for select using (true);
drop policy if exists "catalog read" on public.book_authors;
create policy "catalog read" on public.book_authors for select using (true);
drop policy if exists "catalog read" on public.book_categories;
create policy "catalog read" on public.book_categories for select using (true);
drop policy if exists "catalog read" on public.stationery_categories;
create policy "catalog read" on public.stationery_categories for select using (true);
drop policy if exists "catalog read" on public.slide_contents;
create policy "catalog read" on public.slide_contents for select using (true);

-- admin write on catalog
drop policy if exists "admin write" on public.books;
create policy "admin write" on public.books for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write" on public.stationery;
create policy "admin write" on public.stationery for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write" on public.authors;
create policy "admin write" on public.authors for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write" on public.categories;
create policy "admin write" on public.categories for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write" on public.book_authors;
create policy "admin write" on public.book_authors for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write" on public.book_categories;
create policy "admin write" on public.book_categories for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write" on public.stationery_categories;
create policy "admin write" on public.stationery_categories for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write" on public.slide_contents;
create policy "admin write" on public.slide_contents for all using (public.is_admin()) with check (public.is_admin());

-- notifications: active public-readable, admin manage
drop policy if exists "active notifications read" on public.notifications;
create policy "active notifications read" on public.notifications for select using (is_active or public.is_admin());
drop policy if exists "admin write" on public.notifications;
create policy "admin write" on public.notifications for all using (public.is_admin()) with check (public.is_admin());

-- roles
drop policy if exists "roles read" on public.roles;
create policy "roles read" on public.roles for select using (true);
drop policy if exists "admin write" on public.roles;
create policy "admin write" on public.roles for all using (public.is_admin()) with check (public.is_admin());

-- users
drop policy if exists "own user read" on public.users;
create policy "own user read" on public.users for select using (auth_id = auth.uid() or public.is_admin());
drop policy if exists "own user update" on public.users;
create policy "own user update" on public.users for update using (auth_id = auth.uid()) with check (auth_id = auth.uid());
drop policy if exists "admin manage users" on public.users;
create policy "admin manage users" on public.users for all using (public.is_admin()) with check (public.is_admin());

-- addresses (owner-scoped)
drop policy if exists "own addresses" on public.addresses;
create policy "own addresses" on public.addresses for all
    using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());

-- reviews
drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews for select using (true);
drop policy if exists "own reviews write" on public.reviews;
create policy "own reviews write" on public.reviews for all
    using (user_id = public.app_user_id() or public.is_admin())
    with check (user_id = public.app_user_id() or public.is_admin());
drop policy if exists "stationery reviews read" on public.stationery_reviews;
create policy "stationery reviews read" on public.stationery_reviews for select using (true);
drop policy if exists "own stationery reviews write" on public.stationery_reviews;
create policy "own stationery reviews write" on public.stationery_reviews for all
    using (user_id = public.app_user_id() or public.is_admin())
    with check (user_id = public.app_user_id() or public.is_admin());

-- wishlist
drop policy if exists "own wishlist" on public.wishlists;
create policy "own wishlist" on public.wishlists for all
    using (user_id = public.app_user_id()) with check (user_id = public.app_user_id());

-- orders (owner read + admin manage + guest read)
drop policy if exists "own orders read" on public.orders;
create policy "own orders read" on public.orders for select
    using (user_id = public.app_user_id() or public.is_admin());
drop policy if exists "admin manage orders" on public.orders;
create policy "admin manage orders" on public.orders for all
    using (public.is_admin()) with check (public.is_admin());
drop policy if exists "guest orders readable" on public.orders;
create policy "guest orders readable" on public.orders for select using (user_id is null);

drop policy if exists "own order items read" on public.order_items;
create policy "own order items read" on public.order_items for select using (
    public.is_admin() or exists (
        select 1 from public.orders o
        where o.order_id = order_items.order_id and o.user_id = public.app_user_id()));
drop policy if exists "admin manage order items" on public.order_items;
create policy "admin manage order items" on public.order_items for all
    using (public.is_admin()) with check (public.is_admin());
drop policy if exists "guest order items readable" on public.order_items;
create policy "guest order items readable" on public.order_items for select using (
    exists (select 1 from public.orders o
            where o.order_id = order_items.order_id and o.user_id is null));

-- admin-only / secret tables (no anon/authenticated; service_role bypasses RLS)
drop policy if exists "admin only" on public.admin_login_codes;
create policy "admin only" on public.admin_login_codes for all
    using (public.is_admin()) with check (public.is_admin());
-- chat_sessions: no policy at all → only service_role (the chat function) touches it.
