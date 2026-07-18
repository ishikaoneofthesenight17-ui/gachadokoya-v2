import { readFile } from "node:fs/promises";

const parseCsv = (text) => {
  const records = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; } else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); if (row.some(Boolean)) records.push(row); row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); records.push(row); }
  const [header, ...rows] = records;
  return rows.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
};
const sql = (value) => value === "" || value == null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const files = async (paths) => (await Promise.all(paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")))).flatMap(parseCsv);
// General retailers in the legacy CSV are intentionally excluded because the
// official store itself is real but capsule-machine installation was not verified.
const group = process.argv[2] ?? "base";
const legacyLocations = await files(["../public/seeds/major-gacha-locations.csv"]);
const moriLocations = await files(["../public/seeds/gachagachanomori-additional-2026-07.csv"]);
const priorityLocations = await files(["../public/seeds/priority-chain-additional-2026-07.csv"]);
const retainedLegacy = legacyLocations.filter((row) =>
  row.chain_name === "ガチャガチャの森"
  || row.chain_name === "#C-pla（シープラ）"
  || ["ガシャポンのデパート 池袋総本店", "ガシャポンのデパート 横浜ワールドポーターズ店"].includes(row.name)
);
const groups = {
  base: [...retainedLegacy, ...moriLocations],
  gashapon: priorityLocations.filter((row) => row.chain_name === "ガシャポンのデパート"),
  cpla: priorityLocations.filter((row) => row.chain_name === "#C-pla（シープラ）"),
  dream: priorityLocations.filter((row) => row.chain_name === "ドリームカプセル"),
};
const locations = (groups[group] ?? []).filter((row) => row.category === "ガチャ専門店");
const products = group === "base" ? await files(["../public/seeds/bandai-products-2026-07.csv"]) : [];

console.log(`-- Verified catalog seed generated 2026-07-18. Non-destructive: no DELETE/TRUNCATE.
-- Run migrations/20260718_mvp_catalog_management.sql and
-- migrations/20260718_catalog_seed_metadata.sql before this file.

begin;

with seed(name, chain_name, prefecture, address, latitude, longitude, category, business_hours, official_url, source_checked_at) as (
  values`);
console.log(locations.map((row, index) => `    (${[row.name, row.chain_name, row.prefecture, row.address].map(sql).join(", ")}, ${Number(row.latitude)}, ${Number(row.longitude)}, ${[row.category, row.business_hours, row.official_url, row.source_checked_at].map(sql).join(", ")})${index === locations.length - 1 ? "" : ","}`).join("\n"));
console.log(`)
insert into public.locations
  (name, chain_name, prefecture, address, latitude, longitude, category, business_hours, official_url, source_type, source_checked_at)
select name, chain_name, prefecture, address, latitude, longitude, category, business_hours, official_url, 'official', source_checked_at::date
from seed
where not exists (
  select 1 from public.locations current
  where lower(trim(current.name)) = lower(trim(seed.name))
    and lower(trim(current.address)) = lower(trim(seed.address))
);`);

if (products.length) {
console.log(`
with seed(jan_code, name, maker, series_name, price, category, release_period, official_url, source_checked_at) as (
  values`);
console.log(products.map((row, index) => `    (${[row.jan_code, row.name, row.maker, row.series_name].map(sql).join(", ")}, ${Number(row.price)}, ${[row.category, row.release_period, row.official_url, row.source_checked_at].map(sql).join(", ")})${index === products.length - 1 ? "" : ","}`).join("\n"));
console.log(`)
insert into public.products
  (jan_code, name, maker, series_name, price, category, release_period, official_url, source_checked_at, genre, work_title)
select jan_code, name, maker, series_name, price, category, release_period, official_url, source_checked_at::date, category, series_name
from seed
where not exists (
  select 1 from public.products current
  where current.jan_code = seed.jan_code
     or (current.jan_code is null and lower(trim(current.name)) = lower(trim(seed.name)) and lower(trim(coalesce(current.maker, ''))) = lower(trim(seed.maker)))
);`);
}

console.log(`
commit;
`);
