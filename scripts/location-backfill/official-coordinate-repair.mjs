import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeAddress, normalizeName, normalizeRow } from "./core.mjs";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const validJapan = (latitude, longitude) => Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= 20 && latitude <= 46 && longitude >= 122 && longitude <= 154;

function municipalityMatches(text, row) {
  const normalizedText = normalizeAddress(text);
  const prefecture = normalizeAddress(row.prefecture);
  if (!normalizedText.includes(prefecture)) return false;

  const storedCity = normalizeAddress(row.city);
  const addressWithoutPrefecture = normalizeAddress(row.address).replace(prefecture, "");
  const municipality = storedCity && storedCity !== "null"
    ? storedCity
    : addressWithoutPrefecture.match(/^(.+?市.+?区|.+?郡.+?[町村]|.+?市|.+?区|.+?[町村])/u)?.[1];
  if (!municipality) return false;

  const cityAndWard = municipality.match(/^(.+?市)(.+?区)$/);
  if (cityAndWard) return normalizedText.includes(cityAndWard[1]) && normalizedText.includes(cityAndWard[2]);

  const districtTown = municipality.match(/^(.+?郡)(.+?[町村])$/);
  if (districtTown) return normalizedText.includes(districtTown[1]) && normalizedText.includes(districtTown[2]);

  return normalizedText.includes(municipality);
}

export async function enrichGigoCoordinates(rows, fetchText, checkedAt) {
  const targets = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.chain_name === "GiGO" && row.latitude === null);
  let cursor = 0, accepted = 0; const errors = [];
  await Promise.all(Array.from({ length: 3 }, async () => { while (cursor < targets.length) {
    const { row, index } = targets[cursor++];
    try {
      const search = await fetchText(`https://www.gigo.co.jp/shops?q=${encodeURIComponent(row.name)}`, {}, `gigo/search/${row.id}.html`);
      const pattern = new RegExp(`href="(/shops/[^"]+)"[\\s\\S]{0,1200}<h3[^>]*>${escapeRegExp(row.name)}</h3>`, "i");
      const slug = search.match(pattern)?.[1];
      if (!slug) throw new Error("公式検索で店舗名完全一致なし");
      const detail = await fetchText(`https://www.gigo.co.jp${slug}`, {}, `gigo/details/${row.id}.html`);
      const coordinate = detail.match(/maps\/search\/\?api=1(?:&amp;|\\u0026|&)query=(-?\d+(?:\.\d+)?)(?:%2C|,)(-?\d+(?:\.\d+)?)/i);
      const latitude = Number(coordinate?.[1]), longitude = Number(coordinate?.[2]);
      const addressMatches = municipalityMatches(detail, row);
      if (!coordinate || !validJapan(latitude, longitude) || !addressMatches) throw new Error("公式地図座標または住所検証失敗");
      rows[index] = { ...normalizeRow({ ...row, latitude, longitude, coordinate_source: "GiGO公式店舗詳細（Google Mapsリンク）", coordinate_checked_at: checkedAt }), id: row.id };
      accepted++;
    } catch (error) { errors.push({ id: row.id, name: row.name, reason: error.message }); }
    await wait(150);
  }}));
  return { attempted: targets.length, accepted, errors };
}

async function resolveMapUrl(url, cacheFile, offline) {
  if (offline) return JSON.parse(await readFile(cacheFile, "utf8")).url;
  try {
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "user-agent": "GachadokoyaLocationRepair/1.0" } });
    await mkdir(path.dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, `${JSON.stringify({ url: response.url })}\n`);
    return response.url;
  } catch (error) {
    try { return JSON.parse(await readFile(cacheFile, "utf8")).url; } catch { throw error; }
  }
}

export async function enrichCapsuleCoordinates(rows, fetchText, checkedAt, cacheRoot, offline) {
  const html = await fetchText("https://www.warehousenet.jp/capsule/", {}, "capsule-rakkyoku/list.html");
  const cards = html.split(/<div name="shop\d+"/i).slice(1), links = new Map();
  for (const card of cards) {
    const name = card.match(/<p class="storename">([^<]+)<\/p>/i)?.[1];
    const url = card.match(/class="gmap_link" href="([^"]+)"/i)?.[1];
    if (name && url) links.set(normalizeName(name), url);
  }
  const targets = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.chain_name === "カプセル楽局" && row.latitude === null);
  let accepted = 0; const errors = [];
  for (const { row, index } of targets) try {
    const mapUrl = links.get(normalizeName(row.name));
    if (!mapUrl) throw new Error("公式店舗名・地図リンクなし");
    const finalUrl = await resolveMapUrl(mapUrl, path.join(cacheRoot, "capsule-rakkyoku/maps", `${row.id}.json`), offline);
    const coordinate = finalUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
      || finalUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    const latitude = Number(coordinate?.[1]), longitude = Number(coordinate?.[2]);
    if (!coordinate || !validJapan(latitude, longitude)) throw new Error("公式地図リンクに日本国内座標なし");
    rows[index] = { ...normalizeRow({ ...row, latitude, longitude, coordinate_source: "カプセル楽局公式Google Mapsリンク", coordinate_checked_at: checkedAt }), id: row.id };
    accepted++;
    if (!offline) await wait(300);
  } catch (error) { errors.push({ id: row.id, name: row.name, reason: error.message }); }
  return { attempted: targets.length, accepted, errors };
}
