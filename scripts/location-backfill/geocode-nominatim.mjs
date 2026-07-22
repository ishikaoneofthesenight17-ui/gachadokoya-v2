import { clean, normalizeAddress, normalizeRow } from "./core.mjs";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const cacheName = (row) => `${row.id || normalizeAddress(row.address).slice(0, 80)}`.replace(/[^\p{L}\p{N}._-]+/gu, "_");

// Nominatim's public policy requires a single thread, an identifying User-Agent,
// caching and at most one request per second. makeFetcher supplies the User-Agent
// and persistent cache; this loop deliberately waits 1.1 seconds per request.
export async function geocodeWithNominatim(rows, fetchText, checkedAt, offline) {
  const stats = { attempted: 0, accepted: 0, low_accuracy_rejected: 0, no_result: 0, errors: [] };
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (row.latitude !== null && row.longitude !== null) continue;
    stats.attempted++;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=jp&limit=1&q=${encodeURIComponent(row.address)}`;
      const body = await fetchText(url, { headers: { "accept-language": "ja", referer: "https://gachadokoya.vercel.app/" } }, `nominatim/${cacheName(row)}.json`);
      const result = JSON.parse(body)[0];
      if (!result) { stats.no_result++; stats.errors.push({ id: row.id, name: row.name, address: row.address, reason: "検索結果なし" }); }
      else {
        const display = clean(result.display_name), city = clean(row.city), municipality = city.match(/郡(.+?[町村])$/)?.[1] || city;
        const normalizedDisplay = normalizeAddress(display), latitude = Number(result.lat), longitude = Number(result.lon);
        const addressMatches = normalizedDisplay.includes(normalizeAddress(row.prefecture)) && normalizedDisplay.includes(normalizeAddress(municipality));
        const validRange = Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= 20 && latitude <= 46 && longitude >= 122 && longitude <= 154;
        const preciseEnough = Number(result.place_rank) >= 28;
        if (!addressMatches || !validRange || !preciseEnough) {
          stats.low_accuracy_rejected++;
          stats.errors.push({ id: row.id, name: row.name, address: row.address, returned_address: display, reason: !addressMatches ? "都道府県・市区町村不一致" : !validRange ? "日本域外座標" : "住所精度不足" });
        } else {
          rows[index] = { ...normalizeRow({ ...row, latitude, longitude, coordinate_source: "OpenStreetMap Nominatim住所検索", coordinate_checked_at: checkedAt }), id: row.id };
          stats.accepted++;
        }
      }
    } catch (error) { stats.errors.push({ id: row.id, name: row.name, address: row.address, reason: error.message }); }
    if (!offline) await wait(1100);
  }
  return stats;
}
