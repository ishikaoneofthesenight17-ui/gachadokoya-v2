import { readFile } from "node:fs/promises";

const checkedAt = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
const strip = (value) => value
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&nbsp;/g, " ")
  .replace(/&#8211;/g, "–")
  .replace(/&#038;/g, "&")
  .replace(/〒\s*\d{3}[-−‐ー]\d{4}/g, "")
  .replace(/\s+/g, " ")
  .trim();
const prefecturePattern = /(北海道|東京都|(?:京都|大阪)府|.{2,3}県)/;
const normalize = (value) => value.toLowerCase().replace(/[\s　・･#＃()（）\-]/g, "");

const existingFiles = [
  "../public/seeds/major-gacha-locations.csv",
  "../public/seeds/gachagachanomori-additional-2026-07.csv",
];
const existingText = (await Promise.all(existingFiles.map((path) => readFile(new URL(path, import.meta.url), "utf8")))).join("\n");
const existingNames = new Set([...existingText.matchAll(/^"?([^",]+)"?,/gm)].map((match) => normalize(match[1])));
const rows = [];

const gashapon = JSON.parse(await readFile("/tmp/gashapon-shops.json", "utf8")).gplus_data;
for (const shop of gashapon.filter((item) => item.shop_title.includes("ガシャポンのデパート"))) {
  rows.push({
    name: shop.shop_title.replace("ガシャポンのデパート", "ガシャポンのデパート ").replace(/\s+/g, " ").trim(),
    chainName: "ガシャポンのデパート",
    prefecture: shop.shop_pref,
    address: shop.shop_address,
    latitude: Number(shop.latitude),
    longitude: Number(shop.longitude),
    officialUrl: `https://gashapon.jp/shop/shop.php?shop_code=${shop.shop_code}`,
  });
}

for (let page = 1; page <= 3; page += 1) {
  const shops = JSON.parse(await readFile(`/tmp/cpla-api${page}.json`, "utf8"));
  for (const shop of shops) {
    const title = strip(shop.title.rendered);
    const name = /c-pla/i.test(title) ? title : `#C-pla ${title}`;
    const address = strip(shop.content.rendered.split(/<p[^>]*>/i)[1]?.split(/<\/p>/i)[0] ?? "");
    rows.push({ name, chainName: "#C-pla（シープラ）", prefecture: address.match(prefecturePattern)?.[1] ?? "", address, officialUrl: shop.link });
  }
}

const dreamHtml = await readFile("/tmp/dream-shop.html", "utf8");
for (const article of dreamHtml.matchAll(/<article class="shopItem[\s\S]*?<a href="([^"]+)"[\s\S]*?<h3 class="hS03">([\s\S]*?)<\/h3>[\s\S]*?<span>住所<\/span>[\s\S]*?<dd class="txt fS01">([\s\S]*?)<\/dd>[\s\S]*?<\/article>/g)) {
  const address = strip(article[3]);
  rows.push({
    name: `ドリームカプセル ${strip(article[2])}`,
    chainName: "ドリームカプセル",
    prefecture: address.match(prefecturePattern)?.[1] ?? "",
    address,
    officialUrl: article[1],
  });
}

const additional = [...new Map(rows
  .filter((row) => row.name && row.address && row.prefecture && !existingNames.has(normalize(row.name)))
  .map((row) => [`${normalize(row.name)}|${normalize(row.address)}`, row])).values()];

console.log("name,chain_name,prefecture,address,latitude,longitude,category,business_hours,official_url,source_checked_at");
let succeeded = 0;
for (const shop of additional) {
  if (!Number.isFinite(shop.latitude) || !Number.isFinite(shop.longitude)) {
    try {
      const response = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(shop.address)}`, { signal: AbortSignal.timeout(10000) });
      const result = await response.json();
      if (!result[0]) throw new Error("no result");
      [shop.longitude, shop.latitude] = result[0].geometry.coordinates;
      await new Promise((resolve) => setTimeout(resolve, 120));
    } catch {
      console.error(`Geocoding failed: ${shop.chainName} / ${shop.name} / ${shop.address}`);
      continue;
    }
  }
  console.log([shop.name, shop.chainName, shop.prefecture, shop.address, Number(shop.latitude).toFixed(7), Number(shop.longitude).toFixed(7), "ガチャ専門店", "", shop.officialUrl, checkedAt].map(quote).join(","));
  succeeded += 1;
}
console.error(`Generated ${succeeded}/${additional.length} additional priority-chain stores`);
