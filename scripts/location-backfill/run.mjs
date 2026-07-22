import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { collectBandai } from "./adapters/bandai.mjs";
import { collectGashacoco } from "./adapters/gashacoco.mjs";
import { collectYamada } from "./adapters/yamada.mjs";
import { addKeys, csv, duplicateReason, haversineMeters, keySets, makeFetcher, normalizeRow, sql } from "./core.mjs";
import { geocodeMissing } from "./geocode.mjs";

const { loadEnvConfig } = nextEnv, root = process.cwd(), args = new Set(process.argv.slice(2)); loadEnvConfig(root);
const output = path.join(root, "data/location-backfill"), cacheRoot = path.join(output, "html"), target = 3000, expectedExisting = 1011, needed = target - expectedExisting, checkedAt = new Date().toISOString().slice(0, 10);
const fetchText = makeFetcher({ cacheRoot, offline: args.has("--offline") });
const previousMissingCoordinates = 927;
async function existingLocations() {
  const snapshot = path.join(output, "existing-locations.json"); if (args.has("--existing-snapshot")) return JSON.parse(await readFile(snapshot, "utf8"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; if (!url || !key) throw new Error("Supabase環境変数がありません");
  const client = createClient(url, key), all = []; for (let from = 0; ; from += 1000) { const { data, error } = await client.from("locations").select("*").order("id").range(from, from + 999); if (error) throw error; all.push(...data); if (data.length < 1000) break; }
  await mkdir(output, { recursive: true }); await writeFile(snapshot, `${JSON.stringify(all, null, 2)}\n`); await writeFile(path.join(output, "locations-columns.json"), `${JSON.stringify(Object.keys(all[0] || {}).sort(), null, 2)}\n`); return all;
}
const existing = await existingLocations(), sources = [["バンダイ", collectBandai], ["gashacoco", collectGashacoco], ["ヤマダデンキ", collectYamada]], existingKeys = keySets(existing), candidateKeys = keySets(), eligible = [], sourceReports = [];
for (const [source, collect] of sources) {
  const result = await collect(fetchText, checkedAt, { offline: args.has("--offline") }); let existingDuplicates = 0, candidateDuplicates = 0, invalid = 0, closedExcluded = 0;
  for (const raw of result.rows) {
    const row = normalizeRow(raw); if (!row.name || !row.address || !row.prefecture || !row.source_url || !["confirmed", "candidate"].includes(row.verification_status)) { invalid++; continue; }
    if (duplicateReason(row, existingKeys)) { existingDuplicates++; continue; } if (duplicateReason(row, candidateKeys)) { candidateDuplicates++; continue; }
    addKeys(row, candidateKeys); eligible.push(row);
  }
  sourceReports.push({ source, fetched: result.rows.length, existing_duplicates: existingDuplicates, candidate_duplicates: candidateDuplicates, invalid, closed_excluded: closedExcluded, errors: result.errors.length, error_details: result.errors });
}
const missingBeforeGeocode = eligible.filter((row) => row.latitude === null || row.longitude === null).length;
const geocoding = await geocodeMissing(eligible, fetchText, checkedAt, args.has("--offline"));
eligible.sort((a, b) => Number(b.latitude !== null && b.longitude !== null) - Number(a.latitude !== null && a.longitude !== null) || Number(b.verification_status === "confirmed") - Number(a.verification_status === "confirmed") || a.prefecture.localeCompare(b.prefecture, "ja") || a.name.localeCompare(b.name, "ja"));
const selected = eligible.slice(0, needed), selectedUrls = new Set(selected.map((r) => r.official_url)); for (const report of sourceReports) report.adopted = selected.filter((row) => row.source_name.toLowerCase().includes(report.source.toLowerCase()) || (report.source === "バンダイ" && row.source_name.includes("バンダイ"))).length;
const nearby = []; for (let i = 0; i < selected.length; i++) { const a = selected[i]; if (a.latitude === null || a.longitude === null) continue; for (let j = i + 1; j < selected.length; j++) { const b = selected[j]; if (b.latitude === null || b.longitude === null || a.prefecture !== b.prefecture) continue; const distance = haversineMeters(a, b); if (distance <= 30) nearby.push({ distance_meters: Math.round(distance * 10) / 10, first: { name: a.name, address: a.address, official_url: a.official_url }, second: { name: b.name, address: b.address, official_url: b.official_url }, merged: false }); if (nearby.length >= 300) break; } if (nearby.length >= 300) break; }
await mkdir(output, { recursive: true }); await writeFile(path.join(output, "location-candidates.csv"), csv(selected)); await writeFile(path.join(root, "supabase/seeds/20260722_location_backfill_candidates.sql"), sql(selected));
const countBy = (field) => Object.fromEntries(Object.entries(selected.reduce((acc, row) => { const key = row[field] || "(空欄)"; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).sort(([a], [b]) => a.localeCompare(b, "ja")));
const report = { generated_at: new Date().toISOString(), existing_expected: expectedExisting, existing_actual: existing.length, target_total: target, required_candidates: needed, fetched_total: sourceReports.reduce((sum, r) => sum + r.fetched, 0), eligible_total: eligible.length, selected_candidates: selected.length, projected_total: existing.length + selected.length, selected_official_urls: selectedUrls.size, confirmed: selected.filter((r) => r.verification_status === "confirmed").length, candidate: selected.filter((r) => r.verification_status === "candidate").length, coordinate_improvement: { previous_selected_missing: previousMissingCoordinates, eligible_missing_after_official_sources: missingBeforeGeocode, external_geocoding: geocoding, selected_remaining_missing: selected.filter((r) => r.latitude === null || r.longitude === null).length }, missing: { address: selected.filter((r) => !r.address).length, latitude: selected.filter((r) => r.latitude === null).length, longitude: selected.filter((r) => r.longitude === null).length, coordinate_source: selected.filter((r) => !r.coordinate_source).length, coordinate_checked_at: selected.filter((r) => !r.coordinate_checked_at).length, official_url: selected.filter((r) => !r.official_url).length, verification_status: selected.filter((r) => !r.verification_status).length, chain_name: selected.filter((r) => !r.chain_name).length, city: selected.filter((r) => !r.city).length }, by_source: countBy("source_name"), by_chain: countBy("chain_name"), by_prefecture: countBy("prefecture"), by_verification: countBy("verification_status"), by_coordinate_source: countBy("coordinate_source"), sources: sourceReports, nearby_duplicates: nearby, prefecture_samples: Object.fromEntries([...new Set(selected.map((r) => r.prefecture))].map((prefecture) => [prefecture, selected.filter((r) => r.prefecture === prefecture).slice(0, 3)])), samples: Object.fromEntries([...new Set(selected.map((r) => r.chain_name || r.source_name))].map((chain) => [chain, selected.filter((r) => (r.chain_name || r.source_name) === chain).slice(0, 10)])) };
await writeFile(path.join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify({ existing: existing.length, fetched: report.fetched_total, eligible: eligible.length, selected: selected.length, projected: report.projected_total, confirmed: report.confirmed, candidate: report.candidate, missing: report.missing, errors: sourceReports.reduce((s, r) => s + r.errors, 0) }, null, 2));
