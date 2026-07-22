import { mapLimit, text } from "./core.mjs";

const abs = (href, base) => new URL(href.replaceAll("&amp;", "&"), base).toString();
const links = (html, pattern) => [...html.matchAll(pattern)].map((m) => m[1]);

export async function bandai(fetchHtml, options) {
  const rows = [], errors = [];
  for (let year = options.fromYear; year <= options.toYear; year++) for (let month = 1; month <= 12; month++) {
    if (year === options.toYear && month > options.toMonth) break;
    const ym = `${year}${String(month).padStart(2, "0")}`;
    try {
      const html = await fetchHtml(`https://gashapon.jp/schedule/?ym=${ym}`, "bandai", `${ym}.html`);
      const card = /<a class="c-card__link" href="([^\"]*detail\.php\?jan_code=([^\"]+))"[^>]*>[\s\S]*?<p class="c-card__name">([\s\S]*?)<\/p>[\s\S]*?<i class="c-card__category[^>]*>([\s\S]*?)<\/i>[\s\S]*?<span class="c-card__price--main">([\s\S]*?)<\/span>/g;
      for (const m of html.matchAll(card)) rows.push({ name: text(m[3]), maker: "バンダイ", genre: "ガシャポン", price: m[5], release_period: `${year}年${month}月`, jan_code: m[2], official_url: abs(m[1], "https://gashapon.jp/schedule/"), source_checked_at: options.checkedAt });
    } catch (e) { errors.push(e.message); }
  }
  return { rows, errors };
}

export async function takara(fetchHtml, options) {
  const rows = [], errors = []; let repeated = 0, previous = "";
  for (let page = 1; page <= options.maxPages; page++) {
    try {
      const html = await fetchHtml(`https://www.takaratomy-arts.co.jp/items/gacha/search.html?p=${page}`, "takara", `page-${page}.html`);
      const card = /<a href="(\/items\/item\.html\?n=[^"]+)">[\s\S]*?<h3>([\s\S]*?)<\/h3><p>価格:([\s\S]*?)<\/p><p>発売時期:([\s\S]*?)<\/p>/g;
      const pageRows = [...html.matchAll(card)].map((m) => ({ name: text(m[2]), maker: "タカラトミーアーツ", genre: "ガチャ", price: m[3], release_period: m[4], official_url: abs(m[1], "https://www.takaratomy-arts.co.jp"), source_checked_at: options.checkedAt }));
      const signature = pageRows.map((r) => r.official_url).join("|"); if (!pageRows.length || signature === previous) repeated++; else repeated = 0;
      if (repeated >= 1) break; previous = signature; rows.push(...pageRows);
    } catch (e) { errors.push(e.message); break; }
  }
  return { rows, errors };
}

function detailFields(html) {
  const title = text((html.match(/<h2[^>]*class="[^"]*c-productDetail__title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i)
    || html.match(/<h3[^>]*class="[^"]*title-1[^"]*"[^>]*>([\s\S]*?)<\/h3>/i)
    || html.match(/<meta property="og:title" content="([^"|]+)(?:\||｜)/i) || [])[1]);
  const field = (label) => text((html.match(new RegExp(`<dt[^>]*>\\s*${label}\\s*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`, "i")) || [])[1]);
  const price = (field("価格").match(/[\d,]+(?=\s*円)/) || [])[0] || "";
  const release = field("発売日") || (text(html).match(/((?:20\d{2})年\s*\d{1,2}月)/) || [])[1] || "";
  const jan = (text(html).match(/(?:JAN(?:コード)?|JAN CODE)\s*[:：]?\s*(\d{8,18})/i) || [])[1] || "";
  return { title, price, release, jan };
}

export async function kitan(fetchHtml, options) {
  const urls = new Set(), errors = [];
  for (let page = 1; page <= options.maxPages; page++) try {
    const url = page === 1 ? "https://kitan.jp/products/" : `https://kitan.jp/products/page/${page}/`;
    const html = await fetchHtml(url, "kitan", `page-${page}.html`); const found = links(html, /href="(https:\/\/kitan\.jp\/products\/(?!page\/|feed\/)[^"?#]+\/)"/g);
    const before = urls.size; found.forEach((u) => urls.add(u)); if (!found.length || urls.size === before) break;
  } catch (e) { errors.push(e.message); break; }
  const results = await mapLimit([...urls], 5, async (url, i) => { try {
    const html = await fetchHtml(url, "kitan/details", `${i}-${url.split("/").filter(Boolean).at(-1)}.html`); const d = detailFields(html);
    if (!d.title) throw new Error("商品名を抽出できません"); return { name: d.title, maker: "キタンクラブ", genre: "カプセルトイ", price: d.price, release_period: d.release, jan_code: d.jan, official_url: url, source_checked_at: options.checkedAt };
  } catch (e) { errors.push(`${url}: ${e.message}`); return null; } });
  return { rows: results.filter(Boolean), errors };
}

export async function qualia(fetchHtml, options) {
  const errors = []; let html;
  try { html = await fetchHtml("https://www.qualia-45.jp/product/", "qualia", "index.html"); } catch (e) { return { rows: [], errors: [e.message] }; }
  const urls = [...new Set(links(html, /href="(https:\/\/www\.qualia-45\.jp\/product\/view\/\d+)"/g))];
  const results = await mapLimit(urls, 5, async (url, i) => { try {
    const detail = await fetchHtml(url, "qualia/details", `${i}-${url.split("/").at(-1)}.html`); const d = detailFields(detail);
    if (!d.title) throw new Error("商品名を抽出できません"); return { name: d.title, maker: "Qualia", genre: "カプセルトイ", price: d.price, release_period: d.release, jan_code: d.jan, official_url: url, source_checked_at: options.checkedAt };
  } catch (e) { errors.push(`${url}: ${e.message}`); return null; } });
  return { rows: results.filter(Boolean), errors };
}
