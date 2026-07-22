import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { bandai, kitan, qualia, takara } from "./adapters.mjs";
import { FIELDS, addKeys, compareCandidates, csv, duplicateReason, keySets, makeFetcher, normalizeJan, normalizeName, normalizeProduct, normalizeUrl, sql, unnaturalReason } from "./core.mjs";

const { loadEnvConfig } = nextEnv;
const root = process.cwd(), args = new Set(process.argv.slice(2)); loadEnvConfig(root);
const targetTotal = 3000, expectedExisting = 729, needed = targetTotal - expectedExisting;
const output = path.join(root, "data/product-backfill"), cacheRoot = path.join(output, "html");
const checkedAt = new Date().toISOString(), now = new Date();
const fetchHtml = makeFetcher({ cacheRoot, offline: args.has("--offline") });

async function existingProducts() {
  const snapshot = path.join(output, "existing-products.json");
  if (args.has("--existing-snapshot")) return JSON.parse(await readFile(snapshot, "utf8"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase環境変数がありません。--existing-snapshot を使うか .env.local を設定してください。");
  const client = createClient(url, key); const all = [];
  for (let from = 0; ; from += 1000) { const { data, error } = await client.from("products").select("*").range(from, from + 999); if (error) throw error; all.push(...data); if (data.length < 1000) break; }
  await mkdir(output, { recursive: true }); await writeFile(snapshot, `${JSON.stringify(all, null, 2)}\n`);
  await writeFile(path.join(output, "products-columns.json"), `${JSON.stringify(Object.keys(all[0] || {}).sort(), null, 2)}\n`); return all;
}

const existing = await existingProducts();
const options = { checkedAt, fromYear: 2015, toYear: now.getFullYear(), toMonth: now.getMonth() + 1, maxPages: 250 };
const adapters = [["バンダイ", bandai], ["タカラトミーアーツ", takara], ["キタンクラブ", kitan], ["Qualia", qualia]];
const existingKeys = keySets(existing), candidateKeys = keySets(), candidateByKey = new Map(), pools = [], reportRows = [];
const candidateKey = (row, reason) => reason === "jan_code" ? `jan:${normalizeJan(row.jan_code)}` : reason === "official_url" ? `url:${normalizeUrl(row.official_url)}` : `name:${row.maker.toLowerCase()}\u0000${normalizeName(row.name).toLowerCase()}`;
for (const [maker, adapter] of adapters) {
  const result = await adapter(fetchHtml, options); let existingDuplicates = 0, candidateDuplicates = 0, unnaturalExcluded = 0; const accepted = [], normalized = [];
  for (const raw of result.rows) {
    const row = normalizeProduct(raw); if (!row.name || !row.official_url) { result.errors.push(`${row.official_url || maker}: 必須項目不足`); continue; }
    if (unnaturalReason(row)) { unnaturalExcluded++; continue; }
    if (duplicateReason(row, existingKeys)) { existingDuplicates++; continue; }
    normalized.push(row);
  }
  normalized.sort(compareCandidates);
  for (const row of normalized) {
    const reason = duplicateReason(row, candidateKeys);
    if (reason) {
      candidateDuplicates++;
      const retained = candidateByKey.get(candidateKey(row, reason));
      if (retained) for (const field of FIELDS) if ((retained[field] === null || retained[field] === "") && row[field] !== null && row[field] !== "") retained[field] = row[field];
      continue;
    }
    addKeys(row, candidateKeys); accepted.push(row);
    if (row.jan_code) candidateByKey.set(`jan:${normalizeJan(row.jan_code)}`, row);
    if (row.official_url) candidateByKey.set(`url:${normalizeUrl(row.official_url)}`, row);
    candidateByKey.set(`name:${row.maker.toLowerCase()}\u0000${normalizeName(row.name).toLowerCase()}`, row);
  }
  pools.push(accepted.sort(compareCandidates));
  reportRows.push({ maker, fetched: result.rows.length, eligible: accepted.length, adopted: 0, existing_duplicates: existingDuplicates, candidate_duplicates: candidateDuplicates, unnatural_excluded: unnaturalExcluded, errors: result.errors.length, error_details: result.errors });
}
const selected = [];
while (selected.length < needed && pools.some((pool) => pool.length)) for (let i = 0; i < pools.length && selected.length < needed; i++) {
  const row = pools[i].shift(); if (row) { selected.push(row); reportRows[i].adopted++; }
}
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "product-candidates.csv"), csv(selected));
await writeFile(path.join(root, "supabase/seeds/20260722_product_backfill_candidates.sql"), sql(selected));
const report = { generated_at: checkedAt, existing_expected: expectedExisting, existing_actual: existing.length, target_total: targetTotal, required_candidates: needed, selected_candidates: selected.length, projected_total: existing.length + selected.length, manufacturers: reportRows };
await writeFile(path.join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
const table = reportRows.map((r) => `| ${r.maker} | ${r.fetched} | ${r.eligible} | ${r.adopted} | ${r.existing_duplicates} | ${r.candidate_duplicates} | ${r.errors} |`).join("\n");
await writeFile(path.join(output, "REPORT.md"), `# 公式商品バックフィル検証レポート\n\n生成日時: ${checkedAt}\n\n- products実件数: ${existing.length}（基準: ${expectedExisting}）\n- 目標: ${targetTotal}\n- 必要候補: ${needed}\n- 採用候補: ${selected.length}\n- 投入後見込み: ${existing.length + selected.length}\n\n| メーカー | 取得 | 重複除外後 | 採用 | 既存重複 | 候補内重複 | エラー |\n|---|---:|---:|---:|---:|---:|---:|\n${table}\n\nエラー詳細は \`report.json\` を確認してください。画像は全件空欄です。店舗・在庫・目撃情報は生成していません。\n`);
console.log(JSON.stringify(report, null, 2));
