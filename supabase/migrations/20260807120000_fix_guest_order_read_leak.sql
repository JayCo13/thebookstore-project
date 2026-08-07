-- =============================================================================
-- Fix: an authenticated customer's order list showed OTHER people's orders.
--
-- Cause: `guest orders readable` (20260601120500 / re-created in 20260601120600)
-- was a blanket `using (user_id is null)`. Postgres ORs all permissive policies
-- together, so for a logged-in customer the effective SELECT filter on
-- public.orders was:
--
--     user_id = app_user_id()  OR  is_admin()  OR  user_id IS NULL
--
-- The guest-tracking page reads one order by id, so the blanket policy looked
-- harmless — but the account order list (`select * from orders`, no user filter,
-- newest first) picked up EVERY guest order in the table, i.e. other customers'
-- names, phones, addresses and totals.
--
-- Fix: scope the guest policies to genuinely unauthenticated sessions
-- (`auth.uid() is null`). A signed-in user now only ever sees their own orders
-- (or everything, if admin); guest order tracking by id keeps working for
-- visitors with no session, exactly like the old FastAPI endpoint.
-- =============================================================================

drop policy if exists "guest orders readable" on public.orders;
create policy "guest orders readable" on public.orders
    for select using (user_id is null and auth.uid() is null);

drop policy if exists "guest order items readable" on public.order_items;
create policy "guest order items readable" on public.order_items
    for select using (
        auth.uid() is null
        and exists (
            select 1 from public.orders o
            where o.order_id = order_items.order_id
              and o.user_id is null
        )
    );
