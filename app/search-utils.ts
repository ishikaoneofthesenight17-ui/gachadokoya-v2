const synonymGroups = [
  ["猫", "ねこ", "ネコ", "cat"],
  ["犬", "いぬ", "イヌ", "dog"],
  ["キーホルダー", "キーリング", "バッグチャーム", "チャーム"],
  ["アクリルキーホルダー", "アクキー"],
  ["アクリルスタンド", "アクスタ"],
  ["ぬいぐるみ", "ぬい", "マスコット"],
  ["フィギュア", "人形", "ミニフィギュア"],
  ["ポーチ", "小物入れ", "ミニポーチ"],
  ["缶バッジ", "カンバッジ", "バッジ"],
  ["ストラップ", "根付", "ねつけ"],
  ["シール", "ステッカー"],
  ["エコバッグ", "トートバッグ", "バッグ"],
] as const;

function katakanaToHiragana(value: string) {
  return value.replace(/[ァ-ヶ]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x60)
  );
}

export function normalizeSearchText(value: string) {
  return katakanaToHiragana(value.normalize("NFKC").toLowerCase())
    .replace(/[\s\u3000・･_\-ー—―/／,，.。:：;；()（）[\]【】「」『』]/g, "")
    .trim();
}

const normalizedSynonymGroups = synonymGroups.map((group) =>
  group.map((word) => normalizeSearchText(word))
);

function expandToken(token: string) {
  const normalizedToken = normalizeSearchText(token);
  const matchingGroup = normalizedSynonymGroups.find((group) =>
    group.some(
      (word) =>
        word === normalizedToken ||
        word.includes(normalizedToken) ||
        normalizedToken.includes(word)
    )
  );

  return matchingGroup ?? [normalizedToken];
}

export function matchesFlexibleSearch(searchableValues: unknown[], query: string) {
  const rawTokens = query
    .normalize("NFKC")
    .trim()
    .split(/[\s\u3000]+/)
    .filter(Boolean);

  if (rawTokens.length === 0) return true;

  const searchableText = normalizeSearchText(
    searchableValues
      .filter((value): value is string | number =>
        typeof value === "string" || typeof value === "number"
      )
      .join(" ")
  );

  return rawTokens.every((token) =>
    expandToken(token).some((candidate) => searchableText.includes(candidate))
  );
}
