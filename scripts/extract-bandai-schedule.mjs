import { readFile } from "node:fs/promises";

const html = await readFile(process.argv[2] ?? "/tmp/gasha.html", "utf8");
const checkedAt = process.argv[3] ?? new Date().toISOString().slice(0, 10);
const decode = (value) => value
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"')
  .replaceAll("&#039;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">");
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
const rows = [];

for (const week of html.matchAll(/<div class="week">([\s\S]*?)(?=<div class="week">|<\/div>\s*<\/div>\s*<\/div>)/g)) {
  const body = week[1];
  const dates = [...body.matchAll(/pg-schedule__month--date">(\d+)</g)].map((match) => match[1]);
  const releasePeriod = dates.length >= 2 ? `2026年${dates[0]}月 第${dates[1]}週より順次` : "2026年7月";
  for (const card of body.matchAll(/href="\.\.\/products\/detail\.php\?jan_code=(\d+)"[^>]*alt="([^"]+)"[\s\S]*?data-category="([^"]+)"[^>]*>([^<]+)<[\s\S]*?c-card__price--main">([0-9,]+)</g)) {
    const [, janCode, encodedName, , officialCategory, price] = card;
    const name = decode(encodedName.trim());
    const seriesName = name.split(/\s+(?:めじるし|まちぼうけ|カプセル|ミニチュア|フィギュア|マスコット|チャーム|コレクション|ポーチ|バッグ|ラバーマスコット)/)[0] || name;
    rows.push({ janCode, name, seriesName, price: price.replaceAll(",", ""), category: officialCategory.trim(), releasePeriod });
  }
}

const unique = [...new Map(rows.map((row) => [row.janCode, row])).values()];
console.log("jan_code,name,maker,series_name,price,category,release_period,official_url,source_checked_at");
for (const row of unique) {
  console.log([
    row.janCode,
    row.name,
    "バンダイ",
    row.seriesName,
    row.price,
    row.category,
    row.releasePeriod,
    `https://gashapon.jp/products/detail.php?jan_code=${row.janCode}`,
    checkedAt,
  ].map(quote).join(","));
}
console.error(`Extracted ${unique.length} official Bandai products`);
