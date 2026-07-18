-- Bulk master import support for the public MVP.
-- Run after 20260718_mvp_catalog_management.sql.

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

create index if not exists import_logs_created_at_idx
on public.import_logs (created_at desc);

create index if not exists locations_created_at_idx
on public.locations (created_at desc);

create index if not exists products_created_at_idx
on public.products (created_at desc);

alter table public.import_logs enable row level security;
drop policy if exists "import logs readable" on public.import_logs;
create policy "import logs readable"
on public.import_logs for select using (true);
drop policy if exists "import logs insertable" on public.import_logs;
create policy "import logs insertable"
on public.import_logs for insert with check (import_type in ('locations', 'products'));
