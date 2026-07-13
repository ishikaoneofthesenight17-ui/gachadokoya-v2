import type { Spot } from "./types";

const groups = [
  ["猫", "ねこ", "ネコ", "cat", "キャット"],
  ["犬", "いぬ", "イヌ", "dog", "ドッグ"],
  ["ガチャ", "ガチャガチャ", "カプセルトイ", "カプセル", "capsule"],
  ["サンリオ", "sanrio"],
  ["ポケモン", "pokemon", "pokémon"],
  ["ちいかわ", "チイカワ"],
  ["ミニチュア", "miniature", "模型"],
];

export function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　・･ー_\-\/]/g, "")
    .replace(/[ぁ-ん]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0x60));
}

function expandQuery(query: string) {
  const normalized = normalizeText(query);
  const words = new Set([normalized]);
  for (const group of groups) {
    if (group.some((x) => normalizeText(x) === normalized || normalized.includes(normalizeText(x)))) {
      group.forEach((x) => words.add(normalizeText(x)));
    }
  }
  return [...words];
}

export function matchesSpot(spot: Spot, query: string) {
  if (!query.trim()) return true;
  const haystack = normalizeText([
    spot.product_name,
    spot.shop_name,
    spot.address,
    spot.maker,
    spot.category,
    spot.comment,
  ].filter(Boolean).join(" "));
  return expandQuery(query).some((q) => haystack.includes(q));
}
