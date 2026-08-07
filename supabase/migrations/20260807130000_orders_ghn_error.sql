-- =============================================================================
-- Record WHY an order never got a GHN waybill.
--
-- Until now a failed GHN submit was invisible: submitGhnOrder() logged and
-- returned null, fulfillOrder() carried on sending the confirmation email, and
-- create-order swallowed the whole thing. The customer saw "đặt hàng thành
-- công", the admin saw a normal order, and nobody learned the shipment didn't
-- exist. 7 of 32 orders were in that state before anyone noticed.
--
-- ghn_error holds GHN's own message ("số điện thoại … không đúng") or the
-- transport failure, so the admin can act on it. Cleared on success.
-- =============================================================================

alter table public.orders
    add column if not exists ghn_error           text,
    add column if not exists ghn_last_attempt_at timestamptz;

comment on column public.orders.ghn_error is
    'Why the last GHN shipping-order submit failed; null when it succeeded or was never attempted.';
comment on column public.orders.ghn_last_attempt_at is
    'When the last GHN shipping-order submit was attempted.';

-- Orders still waiting on a waybill — what an admin needs to chase.
create index if not exists orders_missing_waybill_idx
    on public.orders (order_date desc)
    where ghn_order_code is null;
