-- Compatibility migration for projects that started from schema-v8-location-master.sql.
-- Existing rows are preserved. Run this before every catalog seed file.

create extension if not exists pgcrypto;

-- schema-v8 may encounter a pre-existing, older locations table. Ensure every
-- column used by the current app and the verified seed exists in that case.
alter table public.locations add column if not exists chain_name text;
alter table public.locations add column if not exists prefecture text;
alter table public.locations add column if not exists address text;
alter table public.locations add column if not exists latitude double precision;
alter table public.locations add column if not exists longitude double precision;
alter table public.locations add column if not exists category text;
alter table public.locations add column if not exists business_hours text;
alter table public.locations add column if not exists official_url text;
alter table public.locations add column if not exists source_type text default 'user';
alter table public.locations add column if not exists source_checked_at date;
alter table public.locations add column if not exists user_note text;
alter table public.locations add column if not exists created_at timestamptz default now();
alter table public.locations add column if not exists updated_at timestamptz default now();

-- Copy coordinates from the old lat/lng naming convention when those columns
-- exist. Dynamic SQL keeps this migration valid when they do not exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'locations' and column_name = 'lat'
  ) then
    execute 'update public.locations set latitude = lat where latitude is null and lat is not null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'locations' and column_name = 'lng'
  ) then
    execute 'update public.locations set longitude = lng where longitude is null and lng is not null';
  end if;
end $$;

create index if not exists locations_name_idx on public.locations (lower(name));
create index if not exists locations_prefecture_idx on public.locations (prefecture);
create index if not exists locations_chain_name_idx on public.locations (chain_name);
create index if not exists locations_source_type_idx on public.locations (source_type);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  maker text,
  genre text,
  work_title text,
  character_name text,
  creator text,
  image_url text,
  series_name text,
  price integer,
  category text,
  release_period text,
  official_url text,
  source_checked_at date,
  jan_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists maker text;
alter table public.products add column if not exists genre text;
alter table public.products add column if not exists work_title text;
alter table public.products add column if not exists character_name text;
alter table public.products add column if not exists creator text;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists series_name text;
alter table public.products add column if not exists price integer;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists release_period text;
alter table public.products add column if not exists official_url text;
alter table public.products add column if not exists source_checked_at date;
alter table public.products add column if not exists jan_code text;
alter table public.products add column if not exists created_at timestamptz default now();
alter table public.products add column if not exists updated_at timestamptz default now();

create index if not exists products_name_idx on public.products (lower(name));
create unique index if not exists products_jan_code_unique_idx
  on public.products (jan_code)
  where jan_code is not null;

alter table public.locations enable row level security;
drop policy if exists "locations are readable" on public.locations;
create policy "locations are readable" on public.locations for select using (true);
drop policy if exists "locations can be inserted" on public.locations;
create policy "locations can be inserted" on public.locations for insert with check (true);

alter table public.products enable row level security;
drop policy if exists "products are readable" on public.products;
create policy "products are readable" on public.products for select using (true);
drop policy if exists "products can be inserted" on public.products;
create policy "products can be inserted" on public.products for insert with check (true);
