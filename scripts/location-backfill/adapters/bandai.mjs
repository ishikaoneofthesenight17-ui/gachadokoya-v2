import { PREFECTURES, chainOf, normalizeRow } from "../core.mjs";

export async function collectBandai(fetchText, checkedAt) {
  const rows = [], errors = [], sourceUrl = "https://gashapon.jp/shop/gplus_list.php?product_reset=true";
  for (const prefecture of PREFECTURES) try {
    const body = new URLSearchParams({ pref: prefecture, free: "", product_code: "", gplus_type: "gplus", center_lat: "35.728856", center_lng: "139.720078", map_distance_flg: "false" });
    const text = await fetchText("https://gashapon.jp/shop/leaflet/getShops.php", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body }, `bandai/${prefecture}.json`);
    const payload = JSON.parse(text); if (!payload.status || !Array.isArray(payload.gplus_data)) throw new Error("invalid response");
    for (const shop of payload.gplus_data) {
      if (String(shop.delflg) !== "0" || /閉店|営業終了|CLOSE/i.test(shop.shop_title || "")) continue;
      const address = String(shop.shop_address || "").startsWith(prefecture) ? shop.shop_address : `${prefecture}${shop.shop_address || ""}`;
      const chain = chainOf(shop.shop_title || "");
      rows.push(normalizeRow({ name: shop.shop_title, chain_name: chain, category: chain && /ガシャポン|C-pla|ガチャ|カプセル|Pon!|gashacoco/i.test(chain) ? "ガチャ専門店" : "ガチャ設置店", prefecture, address, latitude: shop.latitude, longitude: shop.longitude, coordinate_source: "バンダイ公式店舗API", coordinate_checked_at: checkedAt, official_store_id: `bandai:${shop.shop_code || shop.id}`, official_url: shop.shop_code ? `https://gashapon.jp/shop/shop.php?shop_code=${encodeURIComponent(shop.shop_code)}` : sourceUrl, source_name: "バンダイ ガシャポンどこ？", source_url: sourceUrl, source_type: "official", source_checked_at: checkedAt, verification_status: "confirmed" }));
    }
  } catch (error) { errors.push(`${prefecture}: ${error.message}`); }
  return { rows, errors };
}
