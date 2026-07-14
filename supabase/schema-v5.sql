-- ガチャドコヤ v5 将来拡張用
-- 現在の products / locations / sightings はそのまま利用します。
-- このSQLは「助かった！」を端末内保存ではなくDB共有へ切り替える際に使用します。

create table if not exists public.helpful_reactions (
  id uuid primary key default gen_random_uuid(),
  sighting_id uuid not null references public.sightings(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  unique (sighting_id, device_id)
);

alter table public.helpful_reactions enable row level security;

create policy "helpful reactions are readable"
on public.helpful_reactions for select
using (true);

create policy "helpful reactions can be inserted"
on public.helpful_reactions for insert
with check (true);

create policy "helpful reactions can be deleted"
on public.helpful_reactions for delete
using (true);

create index if not exists helpful_reactions_sighting_id_idx
on public.helpful_reactions(sighting_id);
