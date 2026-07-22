import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const FIELDS = ["name", "chain_name", "category", "prefecture", "city", "address", "latitude", "longitude", "coordinate_source", "coordinate_checked_at", "official_store_id", "official_url", "source_name", "source_url", "source_type", "source_checked_at", "verification_status", "candidate_reason"];
export const PREFECTURES = ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"];

export function clean(value = "") {
  return String(value).replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number.parseInt(n, 10))).normalize("NFKC").replace(/\s+/g, " ").trim();
}
export const normalizeName = (value) => clean(value).toLowerCase().replace(/ガシャココ/g, "gashacoco").replace(/[\s　・･#＃()（）\-ー—―]/g, "");
export const normalizeAddress = (value) => clean(value).toLowerCase().replace(/〒?\d{3}-?\d{4}/g, "").replace(/[\s　,，.。\-−‐ー]/g, "").replace(/[０-９]/g, (n) => String.fromCharCode(n.charCodeAt(0) - 0xfee0));
export function normalizeUrl(value) { try { const url = new URL(clean(value)); url.hash = ""; url.searchParams.sort(); return url.toString().replace(/\/$/, ""); } catch { return ""; } }
export function numberOrNull(value) { const n = Number(value); return value !== "" && value !== null && Number.isFinite(n) ? n : null; }
export function prefectureOf(address, fallback = "") { return PREFECTURES.find((pref) => clean(address).startsWith(pref)) || clean(fallback); }
export function cityOf(address, prefecture) {
  const rest = clean(address).replace(new RegExp(`^${prefecture}`), "");
  return (rest.match(/^(.+?郡.+?[町村])/) || rest.match(/^(.+?市.+?区)/) || rest.match(/^(.+?[市区町村])/))?.[1] ?? "";
}
export function chainOf(name) {
  const rules = [[/ガシャポンのデパート/, "ガシャポンのデパート"], [/ガシャポンバンダイオフィシャルショップ/i, "ガシャポンバンダイオフィシャルショップ"], [/#?C-pla|シープラ/i, "#C-pla（シープラ）"], [/ガチャガチャの森/, "ガチャガチャの森"], [/gashacoco|ガシャココ/i, "gashacoco"], [/カプセル楽局/, "カプセル楽局"], [/\bPon!|Pon!/, "Pon!"], [/ドリームカプセル/, "ドリームカプセル"], [/カプセルパーク/, "カプセルパーク"], [/カプセルラボ/, "カプセルラボ"], [/ガチャ王国/, "ガチャ王国"], [/ふぇすたらんど/i, "ふぇすたらんど"], [/\bFESTA\b/i, "FESTA"], [/イオンモール/, "イオンモール"], [/イオン/, "イオン"], [/アピタ/, "アピタ"], [/イトーヨーカドー|イトーヨーカ堂/, "イトーヨーカドー"], [/ヨドバシ/, "ヨドバシカメラ"], [/ビックカメラ/, "ビックカメラ"], [/ヤマダ(?:デンキ|電機)|LABI/i, "ヤマダデンキ"], [/ドン[・･]?キホーテ|ドンキ/, "ドン・キホーテ"], [/アニメイト/, "アニメイト"], [/TSUTAYA/i, "TSUTAYA"], [/ヴィレッジヴァンガード/, "ヴィレッジヴァンガード"], [/ニトリ/, "ニトリ"], [/ファミリーマート/, "ファミリーマート"], [/タワーレコード/, "タワーレコード"], [/フジグラン/, "フジグラン"], [/ゆめタウン/, "ゆめタウン"], [/ベイシア/, "ベイシア"], [/プラサカプコン/, "プラサカプコン"], [/GiGO/i, "GiGO"], [/namco/i, "namco"], [/ラウンドワン/, "ラウンドワン"]];
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? "";
}
export function isSpecialty(row) { return /ガシャポン|ガチャ|C-pla|シープラ|gashacoco|カプセル|Pon!/i.test(`${row.name} ${row.chain_name}`); }
export function normalizeRow(row) {
  const prefecture = prefectureOf(row.address, row.prefecture);
  return { name: clean(row.name), chain_name: clean(row.chain_name) || chainOf(clean(row.name)), category: clean(row.category) || (isSpecialty(row) ? "ガチャ専門店" : "ガチャ設置店"), prefecture, city: clean(row.city) || cityOf(row.address, prefecture), address: clean(row.address), latitude: numberOrNull(row.latitude), longitude: numberOrNull(row.longitude), coordinate_source: clean(row.coordinate_source), coordinate_checked_at: clean(row.coordinate_checked_at).slice(0, 10), official_store_id: clean(row.official_store_id), official_url: normalizeUrl(row.official_url), source_name: clean(row.source_name), source_url: normalizeUrl(row.source_url), source_type: clean(row.source_type) || "official", source_checked_at: clean(row.source_checked_at).slice(0, 10), verification_status: row.verification_status === "confirmed" ? "confirmed" : "candidate", candidate_reason: clean(row.candidate_reason) };
}
export function keys(row) { return { id: clean(row.official_store_id), url: normalizeUrl(row.official_url), nameAddress: `${normalizeName(row.name)}\u0000${normalizeAddress(row.address)}` }; }
export function duplicateReason(row, sets) { const k = keys(row); if (k.id && sets.id.has(k.id)) return "official_store_id"; if (k.url && sets.url.has(k.url)) return "official_url"; if (k.nameAddress !== "\u0000" && sets.nameAddress.has(k.nameAddress)) return "name_address"; return ""; }
export function addKeys(row, sets) { const k = keys(row); if (k.id) sets.id.add(k.id); if (k.url) sets.url.add(k.url); if (k.nameAddress !== "\u0000") sets.nameAddress.add(k.nameAddress); }
export function keySets(rows = []) { const sets = { id: new Set(), url: new Set(), nameAddress: new Set() }; rows.forEach((row) => addKeys(row, sets)); return sets; }
export function haversineMeters(a, b) { const rad = (v) => v * Math.PI / 180, earth = 6371000; const dLat = rad(b.latitude - a.latitude), dLng = rad(b.longitude - a.longitude); const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2; return 2 * earth * Math.asin(Math.sqrt(x)); }
export function csv(rows) { const quote = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`; return `${FIELDS.join(",")}\n${rows.map((row) => FIELDS.map((field) => quote(row[field])).join(",")).join("\n")}\n`; }
const sqlValue = (value) => value === null || value === undefined || value === "" ? "null" : `'${String(value).replaceAll("'", "''")}'`;
export function sql(rows) {
  const columns = FIELDS.join(", "), values = rows.map((row) => `  (${FIELDS.map((field) => ["latitude", "longitude"].includes(field) && row[field] !== null ? row[field] : sqlValue(row[field])).join(", ")})`).join(",\n");
  return `-- Review the CSV and audit report first. Existing locations are never updated or deleted.\nbegin;\ncreate temporary table location_backfill_candidates (${FIELDS.map((f) => `${f} ${["latitude", "longitude"].includes(f) ? "double precision" : ["source_checked_at", "coordinate_checked_at"].includes(f) ? "date" : "text"}`).join(", ")}) on commit drop;\ninsert into location_backfill_candidates (${columns}) values\n${values};\ninsert into public.locations (${columns})\nselect ${columns} from location_backfill_candidates c\nwhere not exists (select 1 from public.locations l where\n  (c.official_store_id is not null and l.official_store_id = c.official_store_id) or\n  (c.official_url is not null and l.official_url = c.official_url) or\n  (regexp_replace(lower(coalesce(l.name,'')), '[\\s　・･#＃()（）\\-ー—―]', '', 'g') = regexp_replace(lower(c.name), '[\\s　・･#＃()（）\\-ー—―]', '', 'g') and regexp_replace(lower(coalesce(l.address,'')), '[\\s　,，.。\\-−‐ー]', '', 'g') = regexp_replace(lower(c.address), '[\\s　,，.。\\-−‐ー]', '', 'g'))\n) on conflict do nothing;\ncommit;\n`;
}
export function makeFetcher({ cacheRoot, offline = false }) { return async (url, options, file) => { const target = path.join(cacheRoot, file); if (offline) return readFile(target, "utf8"); try { const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30000), headers: { "user-agent": "GachadokoyaLocationBackfill/1.0", ...(options?.headers || {}) } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const body = await response.text(); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, body); return body; } catch (error) { try { return await readFile(target, "utf8"); } catch { throw new Error(`${url}: ${error.message}`); } } }; }
