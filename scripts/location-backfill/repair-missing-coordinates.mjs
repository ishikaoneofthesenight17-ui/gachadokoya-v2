import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { collectBandai } from "./adapters/bandai.mjs";
import { collectGashacoco } from "./adapters/gashacoco.mjs";
import { collectYamada } from "./adapters/yamada.mjs";
import { clean, makeFetcher, normalizeAddress, normalizeName, normalizeRow } from "./core.mjs";
import { geocodeWithNominatim } from "./geocode-nominatim.mjs";
import { enrichCapsuleCoordinates, enrichGigoCoordinates } from "./official-coordinate-repair.mjs";

const { loadEnvConfig } = nextEnv;
const root = process.cwd(), args = new Set(process.argv.slice(2));
const output = path.join(root, "data/location-coordinate-repair");
const cacheRoot = path.join(root, "data/location-backfill/html");
const checkedAt = new Date().toISOString().slice(0, 10);
const offline = args.has("--offline");
loadEnvConfig(root);

async function loadCurrentLocations() {
  const snapshot = path.join(output, "current-locations.json");
  if (offline) return JSON.parse(await readFile(snapshot, "utf8"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase環境変数がありません");
  const client = createClient(url, key), rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from("locations").select("*").order("id").range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  await mkdir(output, { recursive: true });
  await writeFile(snapshot, `${JSON.stringify(rows, null, 2)}\n`);
  return rows;
}

function repairAddress(value) {
  return clean(value)
    .replace(/\s+ガチャガチャの森\|店舗一覧[\s\S]*$/i, "")
    .replace(/\s+月[〜~～].*$/i, "")
    .replace(/^(\S+?[都道府県])\1/, "$1");
}

function countBy(rows, field) {
  return Object.fromEntries(Object.entries(rows.reduce((acc, row) => {
    const key = row[field] || "(空欄)";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja")));
}

function sqlValue(value) {
  return value === null || value === undefined || value === "" ? "null" : `'${String(value).replaceAll("'", "''")}'`;
}

function repairSql(rows) {
  const values = rows.map((row) => `  (${sqlValue(row.id)}::uuid, ${row.latitude}, ${row.longitude}, ${sqlValue(row.coordinate_source)}, ${sqlValue(row.coordinate_checked_at)}::date)`).join(",\n");
  return `-- Read-only generated repair. It never inserts or deletes locations.\nbegin;\ncreate temporary table location_coordinate_repairs (id uuid primary key, latitude double precision not null, longitude double precision not null, coordinate_source text not null, coordinate_checked_at date not null) on commit drop;\ninsert into location_coordinate_repairs values\n${values};\nupdate public.locations l\nset latitude = r.latitude, longitude = r.longitude, coordinate_source = r.coordinate_source, coordinate_checked_at = r.coordinate_checked_at\nfrom location_coordinate_repairs r\nwhere l.id = r.id and (l.latitude is null or l.longitude is null);\ncommit;\n`;
}

function markdownTable(counts) {
  return `| 値 | 件数 |\n|---|---:|\n${Object.entries(counts).map(([key, value]) => `| ${key.replaceAll("|", "\\|")} | ${value} |`).join("\n")}`;
}

const current = await loadCurrentLocations();
const missingRaw = current.filter((row) => row.latitude === null || row.longitude === null);
const missing = missingRaw.map((row) => ({ ...normalizeRow({ ...row, address: repairAddress(row.address) }), id: row.id }));
const fetchText = makeFetcher({ cacheRoot, offline });
const officialFetchText = makeFetcher({ cacheRoot, offline: true });
const officialRows = [];
for (const collect of [collectBandai, collectGashacoco, collectYamada]) {
  const result = await collect(officialFetchText, checkedAt, { offline: true });
  officialRows.push(...result.rows.filter((row) => row.latitude !== null && row.longitude !== null));
}

const knownByAddress = new Map();
for (const row of current.filter((item) => item.latitude !== null && item.longitude !== null)) {
  const key = normalizeAddress(repairAddress(row.address));
  if (!key) continue;
  const values = knownByAddress.get(key) || [];
  values.push(row);
  knownByAddress.set(key, values);
}

let existingAddressMatched = 0;
for (let index = 0; index < missing.length; index++) {
  const row = missing[index], matches = knownByAddress.get(normalizeAddress(row.address)) || [];
  const coordinates = new Map(matches.map((match) => [`${match.latitude},${match.longitude}`, match]));
  if (coordinates.size !== 1) continue;
  const match = coordinates.values().next().value;
  missing[index] = { ...normalizeRow({ ...row, latitude: match.latitude, longitude: match.longitude, coordinate_source: `${match.coordinate_source || "既存登録座標"}（住所完全一致）`, coordinate_checked_at: match.coordinate_checked_at || checkedAt }), id: row.id };
  existingAddressMatched++;
}

let officialMatched = 0;
for (let index = 0; index < missing.length; index++) {
  const row = missing[index];
  const matches = officialRows.filter((official) => official.prefecture === row.prefecture && normalizeName(official.name) === normalizeName(row.name));
  if (matches.length !== 1) continue;
  const match = matches[0];
  missing[index] = { ...normalizeRow({ ...row, latitude: match.latitude, longitude: match.longitude, coordinate_source: `${match.coordinate_source}（店舗名完全一致）`, coordinate_checked_at: match.coordinate_checked_at || checkedAt }), id: row.id };
  officialMatched++;
}

const officialDetails = {
  gigo: await enrichGigoCoordinates(missing, fetchText, checkedAt),
  capsule_rakkyoku: await enrichCapsuleCoordinates(missing, fetchText, checkedAt, cacheRoot, offline)
};
const geocoding = await geocodeWithNominatim(missing, fetchText, checkedAt, offline);
const repaired = missing.filter((row) => row.latitude !== null && row.longitude !== null);
const unresolved = missing.filter((row) => row.latitude === null || row.longitude === null);
const csvFields = ["id", "name", "chain_name", "verification_status", "prefecture", "city", "address", "official_url", "official_store_id", "latitude", "longitude", "coordinate_source", "coordinate_checked_at"];
const csv = `${csvFields.join(",")}\n${repaired.map((row) => csvFields.map((field) => `"${String(row[field] ?? "").replaceAll('"', '""')}"`).join(",")).join("\n")}\n`;
const report = {
  generated_at: new Date().toISOString(), total_locations: current.length, initial_missing: missingRaw.length,
  initial_breakdown: { verification_status: countBy(missingRaw, "verification_status"), prefecture: countBy(missingRaw, "prefecture"), source_name: countBy(missingRaw, "source_name"), chain_name: countBy(missingRaw, "chain_name") },
  existing_exact_address_matches: existingAddressMatched, official_exact_name_matches: officialMatched, official_details: officialDetails, geocoding, repaired: repaired.length, unresolved: unresolved.length,
  coordinate_sources: countBy(repaired, "coordinate_source"), unresolved_rows: unresolved,
  safeguards: { inserts: 0, deletes: 0, updates_only_missing_rows: true, update_key: "locations.id", expected_missing_after_sql: unresolved.length }
};
const unresolvedByChain = countBy(unresolved, "chain_name");
const markdown = `# 座標欠損修復 監査結果

- 生成日: ${checkedAt}
- locations総数: ${current.length}
- 修復前の座標欠損: ${missingRaw.length}
- 修復SQL対象: ${repaired.length}
- 未解決: ${unresolved.length}
- SQL適用後の想定座標欠損: ${unresolved.length}

## verification_status別（修復前）

${markdownTable(report.initial_breakdown.verification_status)}

## 都道府県別（修復前）

${markdownTable(report.initial_breakdown.prefecture)}

## source_name別（修復前）

${markdownTable(report.initial_breakdown.source_name)}

## chain_name別（修復前）

${markdownTable(report.initial_breakdown.chain_name)}

## 採用した座標ソース

${markdownTable(report.coordinate_sources)}

## 未解決のchain_name別内訳

${markdownTable(unresolvedByChain)}

未解決の全店舗・住所・公式URL・理由確認用データは \`audit-report.json\` の \`unresolved_rows\`、取得処理別の理由は \`official_details\` と \`geocoding.errors\` に記録しています。

## 安全条件

- INSERT: 0件
- DELETE: 0件
- UPDATE対象: locations.idで特定し、緯度または経度がNULLの行だけ
- Supabase書き込み、commit、push: 未実施
`;
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "coordinate-repairs.csv"), csv);
await writeFile(path.join(output, "audit-report.json"), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(output, "AUDIT_REPORT.md"), markdown);
await writeFile(path.join(root, "supabase/seeds/20260723_location_coordinate_repairs.sql"), repairSql(repaired));
console.log(JSON.stringify({ total: current.length, initial_missing: missingRaw.length, existing_address_matched: existingAddressMatched, official_matched: officialMatched, geocoding: { attempted: geocoding.attempted, accepted: geocoding.accepted, rejected: geocoding.low_accuracy_rejected }, repaired: repaired.length, unresolved: unresolved.length }, null, 2));
