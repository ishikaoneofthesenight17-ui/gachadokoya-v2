import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const FIELDS = ["name", "maker", "work_title", "series_name", "character_name", "genre", "price", "release_period", "jan_code", "official_url", "image_url", "source_checked_at"];

export function text(value = "") {
  return String(value).replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10))).normalize("NFKC")
    .replace(/\s+/g, " ").trim();
}

export function normalizeName(value) { return text(value); }
export function normalizeMaker(value) { return text(value); }
export function normalizeJan(value) {
  const digits = text(value).replace(/\D/g, "");
  return digits.length >= 8 ? digits : "";
}
export function normalizeUrl(value) {
  try { const u = new URL(text(value)); u.hash = ""; u.searchParams.sort(); return u.toString().replace(/\/$/, ""); }
  catch { return ""; }
}
export function normalizePrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const match = text(value).replace(/,/g, "").match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}
export function normalizeRelease(value) {
  const normalized = text(value).replace(/^(発売時期|発売予定|発売)\s*[:：]?\s*/, "");
  const match = normalized.match(/20\d{2}年\s*\d{1,2}月(?:\s*(?:上旬|中旬|下旬)|\s*\([^)]*発売\))?/);
  return match ? match[0].replace(/\s+/g, "") : normalized;
}
export function normalizeProduct(row) {
  return {
    name: normalizeName(row.name), maker: normalizeMaker(row.maker), work_title: text(row.work_title),
    series_name: text(row.series_name), character_name: text(row.character_name), genre: text(row.genre),
    price: normalizePrice(row.price), release_period: normalizeRelease(row.release_period), jan_code: normalizeJan(row.jan_code),
    official_url: normalizeUrl(row.official_url), image_url: "", source_checked_at: text(row.source_checked_at).slice(0, 10),
  };
}

export function duplicateReason(row, sets) {
  const jan = normalizeJan(row.jan_code); if (jan && sets.jan.has(jan)) return "jan_code";
  const url = normalizeUrl(row.official_url); if (url && sets.url.has(url)) return "official_url";
  const name = `${normalizeMaker(row.maker).toLowerCase()}\u0000${normalizeName(row.name).toLowerCase()}`;
  return sets.name.has(name) ? "name_maker" : "";
}
export function addKeys(row, sets) {
  const jan = normalizeJan(row.jan_code); if (jan) sets.jan.add(jan);
  const url = normalizeUrl(row.official_url); if (url) sets.url.add(url);
  sets.name.add(`${normalizeMaker(row.maker).toLowerCase()}\u0000${normalizeName(row.name).toLowerCase()}`);
}
export function keySets(rows = []) { const sets = { jan: new Set(), url: new Set(), name: new Set() }; rows.forEach((r) => addKeys(r, sets)); return sets; }

export function releaseRank(value) {
  const match = text(value).match(/(20\d{2})年\s*(\d{1,2})月/);
  return match ? Number(match[1]) * 100 + Number(match[2]) : 0;
}
export function informationScore(row) {
  return [row.price, row.release_period, row.work_title, row.series_name, row.character_name, row.genre]
    .filter((value) => value !== null && value !== undefined && String(value).trim()).length;
}
export function compareCandidates(a, b) {
  return releaseRank(b.release_period) - releaseRank(a.release_period)
    || informationScore(b) - informationScore(a)
    || Number(Boolean(b.official_url)) - Number(Boolean(a.official_url))
    || Number(Boolean(b.jan_code)) - Number(Boolean(a.jan_code))
    || a.name.localeCompare(b.name, "ja");
}
export function unnaturalReason(row) {
  if (!row.name || !row.maker || !row.official_url) return "required_blank";
  if (/<[^>]+>|&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(row.name)) return "html_fragment";
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd]/.test(row.name)) return "invalid_character";
  if (row.name.length > 160) return "name_too_long";
  if (!row.name.trim() || !row.maker.trim()) return "whitespace_only";
  return "";
}

export function csv(rows) {
  const quote = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return `${FIELDS.join(",")}\n${rows.map((r) => FIELDS.map((f) => quote(r[f])).join(",")).join("\n")}\n`;
}
const sqlValue = (v) => v === null || v === undefined || v === "" ? "null" : `'${String(v).replaceAll("'", "''")}'`;
export function sql(rows) {
  const columns = FIELDS.join(", ");
  const values = rows.map((r) => `  (${FIELDS.map((f) => f === "price" && r[f] !== null ? r[f] : sqlValue(r[f])).join(", ")})`).join(",\n");
  return `-- Generated candidate import. Review the CSV/report before running.\n-- Existing rows are never updated or deleted. Duplicate priority: JAN, URL, maker+name.\nbegin;\ncreate temporary table product_backfill_candidates (${FIELDS.map((f) => `${f} ${f === "price" ? "integer" : f === "source_checked_at" ? "date" : "text"}`).join(", ")}) on commit drop;\ninsert into product_backfill_candidates (${columns}) values\n${values};\ninsert into public.products (${columns})\nselect ${columns} from product_backfill_candidates c\nwhere not exists (select 1 from public.products p where\n  (c.jan_code is not null and p.jan_code = c.jan_code) or\n  (c.official_url is not null and p.official_url = c.official_url) or\n  (lower(trim(p.maker)) = lower(trim(c.maker)) and lower(trim(p.name)) = lower(trim(c.name)))\n)\non conflict do nothing;\ncommit;\n`;
}

export function makeFetcher({ cacheRoot, offline = false }) {
  return async function fetchHtml(url, maker, filename) {
    const file = path.join(cacheRoot, maker, filename);
    if (offline) return readFile(file, "utf8");
    try {
      const response = await fetch(url, { headers: { "user-agent": "GachadokoyaCatalogBackfill/1.0 (+data maintenance; low-rate)" }, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text(); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, html); return html;
    } catch (error) {
      try { return await readFile(file, "utf8"); } catch { throw new Error(`${url}: ${error.message}`); }
    }
  };
}

export async function mapLimit(items, limit, worker) {
  const output = new Array(items.length); let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) { const index = cursor++; output[index] = await worker(items[index], index); }
  }));
  return output;
}
