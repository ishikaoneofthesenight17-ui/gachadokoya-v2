-- MVP: admin location/product entry and user-created gacha spots.
-- Run this file once in the Supabase SQL Editor before publishing.

create extension if not exists pgcrypto;

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  chain_name text,
  prefecture text,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  category text,
  business_hours text,
  official_url text,
  source_type text not null default 'user',
  source_checked_at date,
  user_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.locations add column if not exists chain_name text;
alter table public.locations add column if not exists prefecture text;
alter table public.locations add column if not exists category text;
alter table public.locations add column if not exists business_hours text;
alter table public.locations add column if not exists official_url text;
alter table public.locations add column if not exists source_type text default 'user';
alter table public.locations add column if not exists source_checked_at date;
alter table public.locations add column if not exists user_note text;
alter table public.locations add column if not exists created_at timestamptz default now();
alter table public.locations add column if not exists updated_at timestamptz default now();

create index if not exists locations_name_idx on public.locations (lower(name));

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  maker text,
  genre text,
  work_title text,
  character_name text,
  creator text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists maker text;
alter table public.products add column if not exists genre text;
alter table public.products add column if not exists work_title text;
alter table public.products add column if not exists character_name text;
alter table public.products add column if not exists creator text;
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists created_at timestamptz default now();
alter table public.products add column if not exists updated_at timestamptz default now();

create index if not exists products_name_idx on public.products (lower(name));

-- Authentication is intentionally deferred for this MVP. Public insert access
-- matches the current browser-direct Supabase architecture and must be tightened
-- when administrator authentication is introduced.
alter table public.locations enable row level security;
drop policy if exists "locations are readable" on public.locations;
create policy "locations are readable"
on public.locations for select using (true);
drop policy if exists "locations can be inserted" on public.locations;
create policy "locations can be inserted"
on public.locations for insert with check (source_type in ('official', 'user'));

alter table public.products enable row level security;
drop policy if exists "products are readable" on public.products;
create policy "products are readable"
on public.products for select using (true);
drop policy if exists "products can be inserted" on public.products;
create policy "products can be inserted"
on public.products for insert with check (true);
