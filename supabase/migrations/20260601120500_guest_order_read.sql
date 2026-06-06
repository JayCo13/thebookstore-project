-- =============================================================================
-- Guest order tracking. The checkout success page + guest order lookups read an
-- order by id with no auth. Mirror the old FastAPI behavior where unauthenticated
-- callers could view guest orders (user_id IS NULL) by id.
--
-- Note: like the old API, this makes guest orders readable by anyone who knows
-- (or guesses) the order_id. Registered-user orders stay protected by the
-- existing owner/admin policies.
-- =============================================================================
create policy "guest orders readable" on public.orders
    for select using (user_id is null);

create policy "guest order items readable" on public.order_items
    for select using (
        exists (
            select 1 from public.orders o
            where o.order_id = order_items.order_id
              and o.user_id is null
        )
    );
