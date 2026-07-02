-- Foreign numbers: configurable pricing overrides + live delivery-time stats.
--
-- Context: fn_pricing_config already existed with a single global row
-- (margin_percent, fixed_markup_ngn, override_price_ngn) that purchase.ts /
-- inventory.ts read from. This migration extends it to support OPTIONAL
-- per-country and per-service overrides (NULL = applies to everything),
-- as required so the store owner can tune pricing per market/service from
-- the admin UI without touching code. Written defensively (IF NOT EXISTS /
-- ADD COLUMN IF NOT EXISTS) since the base table was created directly in
-- the Supabase dashboard and isn't tracked anywhere else in this repo.

create table if not exists public.fn_pricing_config (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default true,
  country_code text,
  service_slug text,
  margin_percent numeric,
  fixed_markup_ngn numeric,
  override_price_ngn numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fn_pricing_config add column if not exists country_code text;
alter table public.fn_pricing_config add column if not exists service_slug text;
alter table public.fn_pricing_config add column if not exists margin_percent numeric;
alter table public.fn_pricing_config add column if not exists fixed_markup_ngn numeric;
alter table public.fn_pricing_config add column if not exists override_price_ngn numeric;
alter table public.fn_pricing_config add column if not exists updated_at timestamptz not null default now();

-- Only one ACTIVE rule per (country, service) scope. NULL in either column
-- means "applies to all countries" / "applies to all services" respectively;
-- '' coalesce trick lets a single partial unique index cover every combo
-- (global / country-only / service-only / country+service).
drop index if exists fn_pricing_config_scope_uidx;
create unique index fn_pricing_config_scope_uidx
  on public.fn_pricing_config (coalesce(country_code, ''), coalesce(service_slug, ''))
  where is_active;

-- Seed one global default row if the table is completely empty, so pricing
-- is always resolvable from the DB (visible/editable in the admin UI) rather
-- than silently relying on a code-level constant.
insert into public.fn_pricing_config (is_active, country_code, service_slug, margin_percent, fixed_markup_ngn)
select true, null, null, 25, 0
where not exists (select 1 from public.fn_pricing_config);

create or replace function public.fn_pricing_config_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fn_pricing_config_set_updated_at on public.fn_pricing_config;
create trigger fn_pricing_config_set_updated_at
  before update on public.fn_pricing_config
  for each row execute function public.fn_pricing_config_touch_updated_at();

alter table public.fn_pricing_config enable row level security;

drop policy if exists "fn_pricing_config_admin_all" on public.fn_pricing_config;
create policy "fn_pricing_config_admin_all" on public.fn_pricing_config
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "fn_pricing_config_public_read" on public.fn_pricing_config;
create policy "fn_pricing_config_public_read" on public.fn_pricing_config
  for select to authenticated
  using (is_active);

-- Real, measured OTP delivery-time estimates per country+service, derived
-- from completed orders (created_at -> otp_received_at). Replaces the
-- previously hardcoded "~1 min" / 60-second constant. Countries/services
-- with no order history yet simply have no row here — the UI shows
-- "Varies" instead of inventing a number.
create or replace view public.fn_delivery_stats as
select
  country_code,
  service_slug,
  avg(extract(epoch from (otp_received_at - created_at)))::int as avg_delivery_seconds,
  count(*)::int as sample_size
from public.fn_orders
where otp_received_at is not null
  and status in ('otp_received', 'completed')
  and created_at > now() - interval '30 days'
group by country_code, service_slug;

grant select on public.fn_delivery_stats to authenticated, anon;
