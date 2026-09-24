-- Move the carrier layer from Viettel Post to GoShip (goship.io).
--
-- GoShip is an aggregator: one API in front of ~14 carriers. The shop no longer
-- integrates a carrier at all — it books whichever one GoShip quotes cheapest
-- for the route. That is the whole reason for the move, after GHN's service and
-- then VTP's API both proved unworkable.
--
-- The previous migration (20260914090000) already made these columns
-- carrier-neutral, so this one only adjusts what GoShip does differently. It is
-- deliberately additive: no data is dropped, and orders from either earlier
-- carrier keep everything they had.

-- ---------------------------------------------------------------------------
-- Location ids become text
-- ---------------------------------------------------------------------------
-- GHN and VTP numbered places with integers. GoShip uses string codes —
-- "700000" for Hồ Chí Minh, "701200" for Quận 12 — and although today's values
-- happen to parse as integers, nothing guarantees a future code won't carry a
-- leading zero, which an int column would silently eat. `ward` is already text.
--
-- USING the existing value keeps every historical address intact; an int simply
-- renders as its own digits.
alter table public.orders
    alter column ship_province_id type text using ship_province_id::text,
    alter column ship_district_id type text using ship_district_id::text;

comment on column public.orders.ship_province_id is
  'Carrier city/province code. Integer-as-text for historical GHN/VTP orders, GoShip city code (e.g. "700000") for new ones.';
comment on column public.orders.ship_district_id is
  'Carrier district code. GoShip uses strings (e.g. "701200"); earlier carriers used integers, stored as their own digits.';

-- ---------------------------------------------------------------------------
-- Two identifiers, not one
-- ---------------------------------------------------------------------------
-- A GoShip shipment has GoShip's own id ("GS6ORVVJ16") AND the carrier's waybill
-- number, and they arrive at different times: the id comes back from the create
-- call, the waybill only once the carrier has accepted the parcel (often a
-- webhook later). Cancelling and looking a shipment up need GoShip's id; the
-- customer needs the waybill. One column cannot be both.
--
-- `tracking_code` keeps its meaning — the number a customer tracks — so old
-- orders are unaffected and the admin list needs no change.
alter table public.orders
    add column if not exists carrier_shipment_id text,
    add column if not exists tracking_url        text,
    add column if not exists shipping_rate_id    text;

comment on column public.orders.carrier_shipment_id is
  'GoShip''s own shipment id (e.g. "GS6ORVVJ16"). Used to cancel and to look the shipment up; null for pre-GoShip orders.';
comment on column public.orders.tracking_url is
  'Public tracking page supplied by GoShip for whichever carrier took the parcel. Avoids hardcoding a URL pattern per carrier, which is what the GHN and VTP integrations both did.';
comment on column public.orders.shipping_rate_id is
  'The GoShip quote the customer was priced against, booked verbatim at fulfilment so they are charged what they were quoted.';

create index if not exists idx_orders_carrier_shipment_id
    on public.orders(carrier_shipment_id)
    where carrier_shipment_id is not null;

comment on column public.orders.shipping_service_code is
  'Carrier chosen for this shipment. A GoShip carrier code ("ghnv3", "ghtk") on new orders; a VTP service code on any order created during the brief VTP period.';

-- ---------------------------------------------------------------------------
-- carrier
-- ---------------------------------------------------------------------------
-- Existing rows keep whatever they were. Only the default and the allowed set
-- change, so history stays readable and new orders land as GOSHIP.
alter table public.orders drop constraint if exists orders_carrier_check;
alter table public.orders
    add constraint orders_carrier_check check (carrier in ('GHN', 'VTP', 'GOSHIP'));
alter table public.orders alter column carrier set default 'GOSHIP';

comment on column public.orders.carrier is
  'Who shipped this order: GHN before 2026-09, VTP during the short-lived switch, GOSHIP after. Read it together with tracking_code — the ids are not interchangeable between carriers.';

-- ---------------------------------------------------------------------------
-- shipping_events
-- ---------------------------------------------------------------------------
-- GoShip's webhook carries a per-event message and the carrier that actually
-- moved the parcel, both worth keeping: with an aggregator, "which carrier was
-- this?" stops being a constant and becomes a per-shipment fact.
alter table public.shipping_events
    add column if not exists carrier_code text;

comment on column public.shipping_events.carrier_code is
  'Which underlying carrier reported this event (GoShip''s carrier_short_name, e.g. "ghnv3").';

-- The dedup key still holds: GoShip retries a webhook 3 times when it does not
-- get a 200, and (order_id, status_code, status_at) makes those replays no-ops.
