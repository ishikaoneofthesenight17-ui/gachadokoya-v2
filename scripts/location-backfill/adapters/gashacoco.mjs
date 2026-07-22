import { clean, normalizeRow, prefectureOf } from "../core.mjs";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function collectGashacoco(fetchText, checkedAt, { offline = false } = {}) {
  const url = "https://gashacoco.jp/shop-list/", errors = [], rows = [];
  try {
    const html = await fetchText(url, {}, "gashacoco/shop-list.html");
    const cards = html.split(/<div class="row shop-container border-bottom[^>]*>/i).slice(1);
    for (const card of cards) {
      const title = card.match(/<h4 class="shop-title[^>]*>[\s\S]*?<a[^>]*href="(\/shop-list\/(\d+))"[^>]*>([\s\S]*?)<\/a>/i);
      const name = clean(title?.[3]);
      const address = clean((card.match(/<strong[^>]*>住所\s*<\/strong>\s*<div[^>]*>([\s\S]*?)<\/div>/i) || [])[1]);
      if (!name || !address || /閉店|営業終了/.test(card.slice(0, 2000))) continue;
      rows.push(normalizeRow({ name: /^gashacoco/i.test(name) ? name : `gashacoco ${name}`, chain_name: "gashacoco", category: "ガチャ専門店", prefecture: prefectureOf(address), address, official_store_id: `gashacoco:${title?.[2]}`, official_url: new URL(title?.[1] || "", url).toString(), source_name: "gashacoco公式ショップリスト", source_url: url, source_type: "official", source_checked_at: checkedAt, verification_status: "confirmed" }));
    }
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index], id = row.official_store_id.split(":")[1];
      try {
        const detail = await fetchText(row.official_url, {}, `gashacoco/details/${id}.html`);
        const latitude = detail.match(/"latitude"\s*:\s*"?(-?\d+(?:\.\d+)?)/i)?.[1];
        const longitude = detail.match(/"longitude"\s*:\s*"?(-?\d+(?:\.\d+)?)/i)?.[1];
        if (!latitude || !longitude) throw new Error("構造化データに座標なし");
        rows[index] = normalizeRow({ ...row, latitude, longitude, coordinate_source: "gashacoco公式店舗詳細（JSON-LD）", coordinate_checked_at: checkedAt });
      } catch (error) { errors.push(`${row.name}: ${error.message}`); }
      if (!offline) await wait(500);
    }
  } catch (error) { errors.push(error.message); }
  return { rows, errors };
}
