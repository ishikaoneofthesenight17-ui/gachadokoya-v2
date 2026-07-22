import { clean, normalizeAddress, normalizeRow } from "./core.mjs";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function cacheName(row) {
  return `${row.official_store_id || normalizeAddress(row.address).slice(0, 80)}`.replace(/[^\p{L}\p{N}._-]+/gu, "_");
}

// GSI AddressSearch returns address-reference coordinates. We only accept a
// result whose returned address explicitly contains both prefecture and city.
export async function geocodeMissing(rows, fetchText, checkedAt, offline) {
  const stats = { attempted: 0, accepted: 0, low_accuracy_rejected: 0, errors: [] };
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (row.latitude !== null && row.longitude !== null) continue;
    stats.attempted++;
    try {
      const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(row.address)}`;
      const body = await fetchText(url, {}, `gsi/${cacheName(row)}.json`);
      const results = JSON.parse(body), result = results[0], title = clean(result?.properties?.title);
      const [longitude, latitude] = result?.geometry?.coordinates || [];
      const city = clean(row.city);
      const municipality = city.match(/郡(.+?[町村])$/)?.[1] || city;
      const normalizedTitle = normalizeAddress(title);
      const addressMatches = title && normalizedTitle.includes(normalizeAddress(row.prefecture)) && normalizedTitle.includes(normalizeAddress(municipality));
      const validRange = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && latitude >= 20 && latitude <= 46 && longitude >= 122 && longitude <= 154;
      if (!addressMatches || !validRange) {
        stats.low_accuracy_rejected++;
        stats.errors.push({ name: row.name, address: row.address, returned_address: title, reason: !addressMatches ? "都道府県・市区町村不一致" : "日本域外座標" });
      } else {
        rows[index] = normalizeRow({ ...row, latitude, longitude, coordinate_source: "国土地理院 住所検索API", coordinate_checked_at: checkedAt });
        stats.accepted++;
      }
    } catch (error) {
      stats.errors.push({ name: row.name, address: row.address, reason: error.message });
    }
    if (!offline) await wait(250);
  }
  return stats;
}
