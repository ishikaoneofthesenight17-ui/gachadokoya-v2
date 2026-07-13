create extension if not exists "pgcrypto";

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  product_name text not null,
  maker text,
  category text,
  price integer,
  status text not null default 'unknown' check (status in ('found','low','soldout','unknown')),
  comment text,
  image_url text,
  witnessed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists spots_witnessed_at_idx on public.spots (witnessed_at desc);
create index if not exists spots_status_idx on public.spots (status);

alter table public.spots enable row level security;

drop policy if exists "Anyone can read spots" on public.spots;
create policy "Anyone can read spots" on public.spots for select using (true);

drop policy if exists "Anyone can insert spots" on public.spots;
create policy "Anyone can insert spots" on public.spots for insert with check (true);

insert into public.spots (shop_name,address,lat,lng,product_name,maker,category,price,status,comment,witnessed_at)
select * from (values
('ガチャガチャの森 新宿店','東京都新宿区新宿3丁目',35.6902,139.7020,'ねこのかぶりもの ミニチュアコレクション','キタンクラブ','猫・ミニチュア',400,'found','入口右側の島、上から2段目で確認。',now()-interval '35 minutes'),
('カプセル楽局 池袋店','東京都豊島区東池袋1丁目',35.7308,139.7141,'ちいかわ お座りぬいぐるみ','バンダイ','キャラクター',500,'low','残り少なめ。夕方時点。',now()-interval '4 hours'),
('ヨドバシAkiba カプセルコーナー','東京都千代田区神田花岡町1-1',35.6985,139.7731,'ポケットモンスター フィギュアコレクション','タカラトミーアーツ','アニメ・ゲーム',300,'soldout','台紙はあるが中身なし。',now()-interval '20 hours')
) as v(shop_name,address,lat,lng,product_name,maker,category,price,status,comment,witnessed_at)
where not exists (select 1 from public.spots);
