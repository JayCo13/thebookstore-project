-- Close an IDOR on guest orders.
--
-- `guest orders readable` let ANY anonymous session read EVERY order with
-- user_id null. The tracking page reads one order by id, so it looked like a
-- per-order lookup — but the policy is a filter, not an endpoint, and the anon
-- key is published in the browser bundle. One request with no id at all
--
--     GET /rest/v1/orders?select=*
--
-- returned every guest order in the table: names, phone numbers, delivery
-- addresses, emails and totals. Verified against production, which returned 46.
-- `payos_order_code` was equally enumerable (observed values 3, 4, 22, 26, 46).
--
-- This is the second attempt at this policy. 20260807120000 narrowed it from
-- `user_id is null` to `user_id is null and auth.uid() is null`, which fixed a
-- signed-in customer seeing other people's orders but left every guest order
-- readable by anyone with no session at all. The lesson is that no RLS predicate
-- can express "the visitor who placed THIS order", because an anonymous visitor
-- has no identity to match on — only a secret they hold can stand in for one.
--
-- So: no anonymous read on orders at all. Guest tracking goes through the
-- `order-lookup` edge function, which takes an unguessable token.

-- ---------------------------------------------------------------------------
-- The secret
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

alter table public.orders
    add column if not exists public_token uuid not null default gen_random_uuid();

-- Parked PayOS checkouts get theirs at park time, so the payment's return URL
-- can carry it before the order exists.
alter table public.pending_orders
    add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists idx_orders_public_token on public.orders(public_token);

comment on column public.orders.public_token is
  'Unguessable handle for the order-status page. The only thing a guest presents to read their own order — treat it like a password: never log it, never put it in an admin-facing list.';
comment on column public.pending_orders.public_token is
  'Carried onto the order when the PayOS webhook materialises it, so the payment return URL can reference an order that does not exist yet.';

-- ---------------------------------------------------------------------------
-- Remove the anonymous read
-- ---------------------------------------------------------------------------
-- Nothing replaces these. Guests read their order through the edge function,
-- which runs as service_role and matches on the token; signed-in customers keep
-- "own orders read", and admins keep "admin manage orders".
drop policy if exists "guest orders readable" on public.orders;
drop policy if exists "guest order items readable" on public.order_items;

-- Same hole, same shape: shipping_events is joined to orders by owner, and its
-- owner policy already covers signed-in customers. There was never a guest
-- policy here and there must not be one.
