import { PREFECTURES, clean, normalizeRow } from "../core.mjs";

export async function collectYamada(fetchText, checkedAt) {
  const rows = [], errors = [], sourceUrl = "https://www.yamada-denki.jp/store/";
  let cursor = 0;
  await Promise.all(Array.from({ length: 6 }, async () => { while (cursor < PREFECTURES.length) {
    const index = cursor++;
    const prefecture = PREFECTURES[index], page = index + 1;
    try {
      const html = await fetchText(`https://www.yamada-denki.jp/store/contents/?p=${page}`, {}, `yamada/${page}.html`);
      const pattern = /<A\s+HREF="\.\/\?d=(\d+)"[^>]*>([\s\S]*?)<\/A>[\s\S]*?<DIV CLASS="shop-summary-address">([\s\S]*?)<\/DIV>/gi;
      for (const match of html.matchAll(pattern)) {
        const name = clean(match[2]), address = clean(match[3]).replace(/^〒\s*\d{3}-?\d{4}\s*/, "");
        if (!name || !address || /閉店|営業終了|CLOSE/i.test(name)) continue;
        rows.push(normalizeRow({ name, chain_name: "ヤマダデンキ", category: "家電量販店", prefecture, address, official_store_id: `yamada:${match[1]}`, official_url: `https://www.yamada-denki.jp/store/contents/?d=${match[1]}`, source_name: "ヤマダデンキ公式店舗一覧", source_url: sourceUrl, source_type: "official", source_checked_at: checkedAt, verification_status: "candidate", candidate_reason: "公式店舗一覧で店舗の存在を確認。カプセルトイ設置は未確認。" }));
      }
    } catch (error) { errors.push(`${prefecture}: ${error.message}`); }
  }}));
  cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (cursor < rows.length) {
    const index = cursor++, row = rows[index], id = row.official_store_id.split(":")[1];
    try {
      const detail = await fetchText(row.official_url, {}, `yamada/details/${id}.html`);
      const latitude = detail.match(/\bmap_lat\s*=\s*(-?\d+(?:\.\d+)?)/i)?.[1];
      const longitude = detail.match(/\bmap_lon\s*=\s*(-?\d+(?:\.\d+)?)/i)?.[1];
      if (!latitude || !longitude) throw new Error("公式地図座標なし");
      rows[index] = normalizeRow({ ...row, latitude, longitude, coordinate_source: "ヤマダデンキ公式店舗詳細（地図）", coordinate_checked_at: checkedAt });
    } catch (error) { errors.push(`${row.name}: ${error.message}`); }
  }}));
  return { rows, errors };
}
