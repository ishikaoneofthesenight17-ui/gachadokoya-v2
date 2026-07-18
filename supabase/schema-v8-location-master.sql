-- ガチャドコヤ v8 全国店舗マスタ＋ユーザー店舗登録
-- Supabase SQL Editorで一度だけ実行してください。

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
  source_type text not null default 'user' check (source_type in ('official','user')),
  source_checked_at date,
  user_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.locations add column if not exists chain_name text;
alter table public.locations add column if not exists prefecture text;
alter table public.locations add column if not exists address text;
alter table public.locations add column if not exists category text;
alter table public.locations add column if not exists business_hours text;
alter table public.locations add column if not exists official_url text;
alter table public.locations add column if not exists source_type text default 'user';
alter table public.locations add column if not exists source_checked_at date;
alter table public.locations add column if not exists user_note text;
alter table public.locations add column if not exists created_at timestamptz default now();
alter table public.locations add column if not exists updated_at timestamptz default now();

create unique index if not exists locations_name_address_unique
on public.locations (lower(trim(name)), lower(trim(address)));
create index if not exists locations_prefecture_idx on public.locations(prefecture);
create index if not exists locations_chain_name_idx on public.locations(chain_name);
create index if not exists locations_source_type_idx on public.locations(source_type);

alter table public.locations enable row level security;
drop policy if exists "locations are readable" on public.locations;
create policy "locations are readable" on public.locations for select using (true);
drop policy if exists "locations can be inserted" on public.locations;
create policy "locations can be inserted" on public.locations for insert with check (true);

create table if not exists public.import_logs (
  id uuid primary key default gen_random_uuid(),
  import_type text not null,
  file_name text,
  total_rows integer not null default 0,
  added_rows integer not null default 0,
  skipped_rows integer not null default 0,
  error_rows integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.import_logs enable row level security;
drop policy if exists "import logs readable" on public.import_logs;
create policy "import logs readable" on public.import_logs for select using (true);
drop policy if exists "import logs insertable" on public.import_logs;
create policy "import logs insertable" on public.import_logs for insert with check (true);
