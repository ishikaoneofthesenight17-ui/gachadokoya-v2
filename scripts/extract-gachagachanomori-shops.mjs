import { readFile } from "node:fs/promises";

const html = await readFile(process.argv[2] ?? "/tmp/mori.html", "utf8");
const existingCsv = await readFile(new URL("../public/seeds/major-gacha-locations.csv", import.meta.url), "utf8");
const existingNames = new Set([...existingCsv.matchAll(/^"?([^",]+)"?,/gm)].map((match) => match[1].replaceAll(" ", "")));
const checkedAt = process.argv[3] ?? new Date().toISOString().slice(0, 10);
const strip = (value) => value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/〒\d{3}-\d{4}/, "").replace(/\s+/g, " ").trim();
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
const prefecturePattern = /(北海道|東京都|(?:京都|大阪)府|.{2,3}県)/;
const shops = [];

for (const match of html.matchAll(/<h4 class="name">([\s\S]*?)<\/h4>[\s\S]*?<p class="address">([\s\S]*?)<\/p>/g)) {
  const rawName = strip(match[1]);
  const name = rawName.replace(/^ガチャガチャの森\s*/, "ガチャガチャの森 ").replace(/\s+/g, " ").trim();
  let address = strip(match[2]);
  if (address.startsWith("大阪市")) address = `大阪府${address}`;
  if (address.startsWith("鹿児島鹿児島市")) address = address.replace("鹿児島鹿児島市", "鹿児島県鹿児島市");
  if (!address || existingNames.has(name.replaceAll(" ", ""))) continue;
  shops.push({ name, address, prefecture: address.match(prefecturePattern)?.[1] ?? "", chainName: name.startsWith("Pon!") ? "Pon!" : "ガチャガチャの森" });
}

console.log("name,chain_name,prefecture,address,latitude,longitude,category,business_hours,official_url,source_checked_at");
let succeeded = 0;
for (const shop of shops) {
  const response = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(shop.address)}`, { signal: AbortSignal.timeout(10000) });
  const result = await response.json();
  if (!result[0]) {
    console.error(`Geocoding failed: ${shop.name} / ${shop.address}`);
    continue;
  }
  const [longitude, latitude] = result[0].geometry.coordinates;
  console.log([shop.name, shop.chainName, shop.prefecture, shop.address, latitude.toFixed(7), longitude.toFixed(7), "ガチャ専門店", "", "https://www.gachagachanomori.com/shoplist/", checkedAt].map(quote).join(","));
  succeeded += 1;
  await new Promise((resolve) => setTimeout(resolve, 150));
}
console.error(`Generated ${succeeded}/${shops.length} additional official stores`);
