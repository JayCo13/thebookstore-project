-- =============================================================================
-- PayOS: create the order only after the money arrives.
--
-- Before this, checkout inserted the order (and decremented stock) and *then*
-- sent the customer to PayOS. Every abandoned payment left a dead Unpaid order
-- holding stock, and the order list filled up with rows that were never real.
--
-- Now a PayOS checkout parks the fully-priced order here instead. The payment
-- link is built from this row, and `payos-webhook` materialises the real order
-- on the PAID notification. Abandon the payment and nothing but this row exists.
--
-- The row is a *snapshot*: it carries the validated line items and the prices
-- they were quoted at, so the order that gets created is the one the customer
-- actually paid for, even if catalogue prices moved in between.
-- =============================================================================

-- PayOS requires an integer orderCode that is unique per merchant and never
-- reused. Orders created before this migration used `order_id` as their code,
-- so start well clear of that range.
create sequence if not exists public.payos_order_code_seq
    as bigint start with 1000000 increment by 1;

create table if not exists public.pending_orders (
    payos_order_code   bigint primary key default nextval('public.payos_order_code_seq'),
    -- { body: <create-order request>, priced: { totalAmount, items, ship, hasFreeShip } }
    payload            jsonb       not null,
    -- What we asked PayOS to collect: merchandise + shipping (0 if free-ship).
    amount             integer     not null,
    -- Who was signed in when the link was made (null = guest checkout).
    auth_id            uuid,
    guest_email        text,
    payos_payment_link_id text,
    payos_checkout_url text,
    -- Set once the webhook has turned this into a real order.
    order_id           integer references public.orders(order_id) on delete set null,
    created_at         timestamptz not null default now(),
    consumed_at        timestamptz
);

-- `consumed_at` is claimed with a conditional UPDATE so two concurrent webhook
-- deliveries cannot both materialise the same payment.
create index if not exists pending_orders_unconsumed_idx
    on public.pending_orders (created_at) where consumed_at is null;

-- Service-role only: edge functions read and write this, clients never do.
-- RLS on with no policies denies every anon/authenticated request outright.
alter table public.pending_orders enable row level security;

comment on table public.pending_orders is
    'Parked PayOS checkouts. Materialised into public.orders by the payos-webhook '
    'function when payment confirms; rows with consumed_at null are abandoned '
    'payments and are safe to prune.';
