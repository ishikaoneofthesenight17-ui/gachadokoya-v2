-- Metadata required by the official location backfill. Existing rows are preserved.
alter table public.locations add column if not exists city text;
alter table public.locations add column if not exists official_store_id text;
alter table public.locations add column if not exists source_name text;
alter table public.locations add column if not exists source_url text;
alter table public.locations add column if not exists coordinate_source text;
alter table public.locations add column if not exists coordinate_checked_at date;
create unique index if not exists locations_official_store_id_unique_idx on public.locations (official_store_id) where official_store_id is not null;
create index if not exists locations_city_idx on public.locations (city);
