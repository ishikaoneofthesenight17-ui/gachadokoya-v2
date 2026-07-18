-- Metadata required for verified bulk product seeds. Existing rows are preserved.
alter table public.products add column if not exists series_name text;
alter table public.products add column if not exists price integer;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists release_period text;
alter table public.products add column if not exists official_url text;
alter table public.products add column if not exists source_checked_at date;
alter table public.products add column if not exists jan_code text;

create unique index if not exists products_jan_code_unique_idx
  on public.products (jan_code)
  where jan_code is not null;
