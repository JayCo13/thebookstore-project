-- Cache GoShip's address book.
--
-- Provinces, districts and wards change a few times a year, but checkout asks
-- GoShip for them on every page load. Measured on production: 0.9–3.1s for the
-- province list, and one district lookup took 43 SECONDS. That is the first
-- thing a customer waits on, before they can type anything, and a slow answer
-- there is indistinguishable from a broken page.
--
-- Caching turns it into one local read. It also makes the checkout survive a
-- GoShip outage: `getCities` and friends fall back to a stale row rather than
-- returning an empty dropdown, which is what made the store unorderable when
-- the credentials were wrong.

create table public.goship_locations (
    -- "cities", "districts:700000", "wards:701200"
    cache_key   text primary key,
    places      jsonb not null,
    fetched_at  timestamptz not null default now()
);

comment on table public.goship_locations is
  'Cached GoShip address book. Refreshed on read once stale; a stale row is still served when GoShip is unreachable, because an empty dropdown blocks every order.';
comment on column public.goship_locations.cache_key is
  'Level plus parent id: "cities", "districts:<city>", "wards:<district>".';
comment on column public.goship_locations.fetched_at is
  'When this was last read from GoShip. The TTL lives in the client, not here, so it can change without a migration.';

-- Service-role only: the edge functions read and write this, clients never do.
-- RLS on with no policies denies every anon/authenticated request outright.
alter table public.goship_locations enable row level security;
