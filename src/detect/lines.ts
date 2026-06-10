import type { PositionedText } from "../types";
import { normalizeChar } from "./normalize";

// 日本語 PDF は TextItem が 1〜数文字単位に細切れになるため、
// 行単位に結合してから正規表現を適用する。charMap で正規化後の
// UTF-16 インデックス → 元アイテムの文字位置への逆写像を保持する。
export type CharOrigin = Readonly<{
  itemIndex: number;
  charIndex: number; // アイテム内のコードポイント位置
}>;

export type NormalizedLine = Readonly<{
  text: string;
  // text の UTF-16 単位ごとの由来。区切りとして挿入した空白は null
  charMap: ReadonlyArray<CharOrigin | null>;
  itemIndices: ReadonlyArray<number>;
}>;

// y 中心の差が文字高の 50% 以内なら同一行とみなす。
// 縦書き(ttb)と空白のみのアイテムは対象外(手動マスクに委ねる)。
export const groupIntoLines = (
  texts: ReadonlyArray<PositionedText>,
): ReadonlyArray<ReadonlyArray<number>> => {
  const eligible = texts
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.dir !== "ttb" && t.str.trim().length > 0);

  type LineAcc = Readonly<{
    sumCenter: number;
    count: number;
    minHeight: number;
    indices: ReadonlyArray<number>;
  }>;

  const lines = eligible.reduce<ReadonlyArray<LineAcc>>((acc, { t, i }) => {
    const center = t.rect.y + t.rect.height / 2;
    const matchIndex = acc.findIndex(
      (line) =>
        Math.abs(line.sumCenter / line.count - center) <=
        Math.min(line.minHeight, t.rect.height) * 0.5,
    );
    if (matchIndex === -1) {
      return [
        ...acc,
        { sumCenter: center, count: 1, minHeight: t.rect.height, indices: [i] },
      ];
    }
    return acc.map((line, j) =>
      j === matchIndex
        ? {
            sumCenter: line.sumCenter + center,
            count: line.count + 1,
            minHeight: Math.min(line.minHeight, t.rect.height),
            indices: [...line.indices, i],
          }
        : line,
    );
  }, []);

  return lines
    .map((line) => ({
      y: line.sumCenter / line.count,
      indices: [...line.indices].sort((a, b) => texts[a].rect.x - texts[b].rect.x),
    }))
    .sort((a, b) => a.y - b.y)
    .map((line) => line.indices);
};

// アイテム間の x ギャップが文字高の 2 倍を超える場合は表のセル跨ぎと
// みなして空白を挿入する(セルを跨いだ誤マッチの防止)。
export const buildNormalizedLine = (
  texts: ReadonlyArray<PositionedText>,
  itemIndices: ReadonlyArray<number>,
): NormalizedLine => {
  const built = itemIndices.reduce<{
    text: string;
    charMap: ReadonlyArray<CharOrigin | null>;
    prevEnd: number | null;
    prevHeight: number;
  }>(
    (acc, itemIndex) => {
      const item = texts[itemIndex];
      const gap = acc.prevEnd === null ? 0 : item.rect.x - acc.prevEnd;
      const needsSeparator =
        acc.prevEnd !== null &&
        gap > Math.max(acc.prevHeight, item.rect.height) * 2;
      const chars = Array.from(item.str);
      const normalized = chars.map(normalizeChar);
      const origins = chars.flatMap((_, ci) =>
        Array.from(
          { length: normalized[ci].length },
          (): CharOrigin => ({ itemIndex, charIndex: ci }),
        ),
      );
      return {
        text: acc.text + (needsSeparator ? " " : "") + normalized.join(""),
        charMap: [...acc.charMap, ...(needsSeparator ? [null] : []), ...origins],
        prevEnd: item.rect.x + item.rect.width,
        prevHeight: item.rect.height,
      };
    },
    { text: "", charMap: [], prevEnd: null, prevHeight: 0 },
  );
  return { text: built.text, charMap: built.charMap, itemIndices };
};
