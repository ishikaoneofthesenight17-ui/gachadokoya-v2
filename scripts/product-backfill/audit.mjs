import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { FIELDS, duplicateReason, keySets, normalizeName, normalizeUrl, releaseRank, unnaturalReason } from "./core.mjs";

const root = process.cwd(), output = path.join(root, "data/product-backfill");
function parseCsv(source) {
  const records = []; let record = [], field = "", quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted && char === '"' && source[i + 1] === '"') { field += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ",") { record.push(field); field = ""; }
    else if (!quoted && char === "\n") { record.push(field); if (record.some(Boolean)) records.push(record); record = []; field = ""; }
    else if (char !== "\r") field += char;
  }
  if (field || record.length) { record.push(field); records.push(record); }
  const [headers, ...rows] = records; return rows.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])));
}
const rows = parseCsv(await readFile(path.join(output, "product-candidates.csv"), "utf8"));
const existing = JSON.parse(await readFile(path.join(output, "existing-products.json"), "utf8"));
const columns = JSON.parse(await readFile(path.join(output, "products-columns.json"), "utf8"));
const generation = JSON.parse(await readFile(path.join(output, "report.json"), "utf8"));
const sql = await readFile(path.join(root, "supabase/seeds/20260722_product_backfill_candidates.sql"), "utf8");
const domains = { "バンダイ": ["gashapon.jp", "www.gashapon.jp"], "タカラトミーアーツ": ["www.takaratomy-arts.co.jp"], "キタンクラブ": ["kitan.jp"], Qualia: ["www.qualia-45.jp"] };
const requested = ["name", "maker", "price", "release_period", "jan_code", "official_url"];
const missing = Object.fromEntries(requested.map((field) => [field, rows.filter((row) => !String(row[field] ?? "").trim()).length]));
const byMaker = {}, byYear = {}, byMonth = {}, domainErrors = [], unnatural = [], htmlFragments = [], invalidCharacters = [], nonCapsule = [], blankFields = [];
const candidateSets = keySets(), duplicateCounts = { jan_code: 0, official_url: 0, name_maker: 0 }, existingDuplicateCounts = { jan_code: 0, official_url: 0, name_maker: 0 };
const existingSets = keySets(existing);
for (const row of rows) {
  byMaker[row.maker] = (byMaker[row.maker] || 0) + 1;
  const release = String(row.release_period).match(/(20\d{2})年\s*(\d{1,2})月/);
  if (release) { byYear[release[1]] = (byYear[release[1]] || 0) + 1; const ym = `${release[1]}-${release[2].padStart(2, "0")}`; byMonth[ym] = (byMonth[ym] || 0) + 1; }
  try { const host = new URL(row.official_url).hostname; if (!(domains[row.maker] || []).includes(host)) domainErrors.push({ name: row.name, maker: row.maker, url: row.official_url }); } catch { domainErrors.push({ name: row.name, maker: row.maker, url: row.official_url }); }
  const reason = unnaturalReason(row); if (reason) unnatural.push({ name: row.name, reason });
  for (const field of FIELDS) {
    const value = String(row[field] ?? "");
    if (/<[^>]+>|&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(value)) htmlFragments.push({ name: row.name, field });
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/.test(value)) invalidCharacters.push({ name: row.name, field });
    if (value && !value.trim()) blankFields.push({ name: row.name, field });
  }
  if (!new Set(["ガシャポン", "ガチャ", "カプセルトイ"]).has(row.genre)) nonCapsule.push({ name: row.name, genre: row.genre });
  const candidateReason = duplicateReason(row, candidateSets); if (candidateReason) duplicateCounts[candidateReason]++; else {
    if (row.jan_code) candidateSets.jan.add(row.jan_code); if (row.official_url) candidateSets.url.add(normalizeUrl(row.official_url));
    candidateSets.name.add(`${row.maker.toLowerCase()}\u0000${normalizeName(row.name).toLowerCase()}`);
  }
  const existingReason = duplicateReason(row, existingSets); if (existingReason) existingDuplicateCounts[existingReason]++;
}
const insertMatch = sql.match(/insert into public\.products\s*\(([^)]+)\)/i);
const sqlColumns = insertMatch ? insertMatch[1].split(",").map((value) => value.trim()) : [];
const sqlAudit = {
  has_insert: Boolean(insertMatch), insert_columns: sqlColumns, unknown_columns: sqlColumns.filter((column) => !columns.includes(column)),
  missing_required_name: !sqlColumns.includes("name"), destructive_update: /\bupdate\s+public\.products\b/i.test(sql),
  destructive_delete: /\bdelete\s+from\s+public\.products\b/i.test(sql), destructive_truncate: /\btruncate\s+(?:table\s+)?public\.products\b/i.test(sql),
  has_duplicate_guard: /where not exists/i.test(sql) && /on conflict do nothing/i.test(sql), sql_candidate_rows: (sql.match(/^\s*\('/gm) || []).length,
};
const priorityViolations = {};
for (const maker of ["バンダイ", "タカラトミーアーツ"]) {
  const selected = rows.filter((row) => row.maker === maker); let count = 0;
  for (let i = 1; i < selected.length; i++) if (releaseRank(selected[i - 1].release_period) < releaseRank(selected[i].release_period)) count++;
  priorityViolations[maker] = count;
}
const samples = Object.fromEntries(Object.keys(byMaker).map((maker) => [maker, rows.filter((row) => row.maker === maker).slice(0, maker === "キタンクラブ" ? 7 : 20).map((row) => ({ name: row.name, price: row.price || null, release_period: row.release_period || null, jan_code: row.jan_code || null, official_url: row.official_url }))]));
const excluded = Object.fromEntries(generation.manufacturers.map((m) => [m.maker, m.unnatural_excluded || 0]));
const audit = { audited_at: new Date().toISOString(), candidate_count: rows.length, by_maker: byMaker, by_release_year: byYear, by_release_month: byMonth, missing, official_domain_errors: domainErrors, unnatural_rows: unnatural, html_fragments: htmlFragments, invalid_characters: invalidCharacters, whitespace_only_fields: blankFields, non_capsule_rows: nonCapsule, candidate_duplicates: duplicateCounts, existing_duplicates: existingDuplicateCounts, current_product_columns: columns, sql: sqlAudit, selection_priority_violations: priorityViolations, excluded_unnatural_during_generation: excluded, samples };
await writeFile(path.join(output, "audit-report.json"), `${JSON.stringify(audit, null, 2)}\n`);
const mapRows = (object) => Object.entries(object).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `| ${key} | ${value} |`).join("\n");
const sampleMd = Object.entries(samples).map(([maker, list]) => `## ${maker} 代表サンプル\n\n${list.map((row, i) => `${i + 1}. ${row.name} / ${row.price ?? "価格なし"}円 / ${row.release_period ?? "発売時期なし"} / ${row.jan_code ?? "JANなし"} / ${row.official_url}`).join("\n")}`).join("\n\n");
await writeFile(path.join(output, "AUDIT_REPORT.md"), `# 商品バックフィル最終品質監査\n\n監査日時: ${audit.audited_at}\n\n- 候補数: ${rows.length}\n- 公式ドメイン不一致: ${domainErrors.length}\n- HTML断片: ${htmlFragments.length}\n- 不正・文字化け文字: ${invalidCharacters.length}\n- 不自然な文字列: ${unnatural.length}\n- 空白だけの項目: ${blankFields.length}\n- カプセルトイ外の疑い: ${nonCapsule.length}\n- 候補内重複: ${Object.values(duplicateCounts).reduce((a, b) => a + b, 0)}\n- 既存729件との重複: ${Object.values(existingDuplicateCounts).reduce((a, b) => a + b, 0)}\n- SQL候補行: ${sqlAudit.sql_candidate_rows}\n- SQL未知列: ${sqlAudit.unknown_columns.length}\n- UPDATE/DELETE/TRUNCATE: ${Number(sqlAudit.destructive_update)}/${Number(sqlAudit.destructive_delete)}/${Number(sqlAudit.destructive_truncate)}\n\n## メーカー別\n\n| メーカー | 件数 |\n|---|---:|\n${mapRows(byMaker)}\n\n## 発売年別\n\n| 年 | 件数 |\n|---|---:|\n${mapRows(byYear)}\n\n## 発売月別\n\n| 年月 | 件数 |\n|---|---:|\n${mapRows(byMonth)}\n\n## 欠損数\n\n| 項目 | 件数 |\n|---|---:|\n${mapRows(missing)}\n\n## 不自然候補の除外数\n\n| メーカー | 件数 |\n|---|---:|\n${mapRows(excluded)}\n\n${sampleMd}\n`);
console.log(JSON.stringify({ candidate_count: rows.length, by_maker: byMaker, by_release_year: byYear, missing, domain_errors: domainErrors.length, unnatural: unnatural.length, non_capsule: nonCapsule.length, candidate_duplicates: duplicateCounts, existing_duplicates: existingDuplicateCounts, sql: sqlAudit, priority_violations: priorityViolations }, null, 2));
