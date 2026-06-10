import type { PageData, PiiCategory, PositionedText, Rect } from "../types";
import { padRect, unionRects } from "../utils/geometry";
import { MASK_PADDING, type Detection } from "./detectByRegex";
import { normalizeText } from "./normalize";

export type LabelRule = Readonly<{
  category: PiiCategory;
  labels: ReadonlyArray<string>;
}>;

export const LABEL_RULES: ReadonlyArray<LabelRule> = [
  { category: "name", labels: ["氏名", "名前"] },
  { category: "furigana", labels: ["ふりがな", "フリガナ"] },
];

// 値の収集を打ち切る「別の欄のラベル」語彙
const STOP_WORDS: ReadonlySet<string> = new Set([
  "氏名",
  "名前",
  "ふりがな",
  "フリガナ",
  "生年月日",
  "性別",
  "現住所",
  "住所",
  "連絡先",
  "電話",
  "TEL",
  "年齢",
  "満",
  "印",
  "写真",
  "男",
  "女",
  "男・女",
]);

// ラベル右端から値を探す最大距離(ページ幅に対する比)
const MAX_GAP_X_RATIO = 0.4;
// 下探索の最大 y ギャップ(ラベル高さに対する倍率)
const MAX_GAP_Y_RATIO = 3;
// 同一アイテム内のラベル直後に許す区切り文字(「氏名: 山田太郎」対応)
const INLINE_SEPARATORS: ReadonlySet<string> = new Set([" ", ":", "、", "："]);

const stripped = (item: PositionedText): string =>
  normalizeText(item.str).replace(/\s/g, "");

const isStopWord = (item: PositionedText): boolean =>
  STOP_WORDS.has(stripped(item));

const yOverlaps = (a: Rect, b: Rect): boolean =>
  Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) >
  Math.min(a.height, b.height) * 0.5;

const xOverlaps = (a: Rect, b: Rect): boolean =>
  Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x);

type LabelHit = Readonly<{
  category: PiiCategory;
  lineIdx: number;
  // 行内 indices 配列上のラベル占有範囲 [startPos, endPos)
  startPos: number;
  endPos: number;
  rect: Rect;
  // 「氏名: 山田太郎」のように同一アイテム内に値が続く場合の値先頭(コードポイント位置)
  inlineValueStart: number | null;
}>;

// ラベルが「氏」「名」のように複数アイテムに分割されている場合に備え、
// 連続する最大 4 アイテムの結合文字列で照合する
const findLabelHits = (
  texts: ReadonlyArray<PositionedText>,
  lines: ReadonlyArray<ReadonlyArray<number>>,
  rules: ReadonlyArray<LabelRule>,
): ReadonlyArray<LabelHit> =>
  lines.flatMap((indices, lineIdx) =>
    indices.flatMap((_, pos) =>
      rules.flatMap((rule) => {
        const windows = [1, 2, 3, 4].filter((k) => pos + k <= indices.length);
        const exact = windows.flatMap((k) => {
          const windowItems = indices
            .slice(pos, pos + k)
            .map((idx) => texts[idx]);
          const joined = windowItems.map(stripped).join("");
          if (!rule.labels.includes(joined)) return [];
          const rect = unionRects(windowItems.map((t) => t.rect));
          return rect
            ? [
                {
                  category: rule.category,
                  lineIdx,
                  startPos: pos,
                  endPos: pos + k,
                  rect,
                  inlineValueStart: null,
                } satisfies LabelHit,
              ]
            : [];
        });
        if (exact.length > 0) return [exact[0]];

        // 単一アイテム内にラベル+区切り+値が同居するケース
        const item = texts[indices[pos]];
        const chars = Array.from(normalizeText(item.str));
        const matched = rule.labels.find((label) => {
          const nonSpace = chars.filter((c) => c !== " ").join("");
          return nonSpace.startsWith(label) && nonSpace.length > label.length;
        });
        if (matched === undefined) return [];
        // ラベル末尾のコードポイント位置を空白スキップしながら特定
        const labelEnd = chars.reduce<{ consumed: number; end: number }>(
          (acc, c, ci) =>
            acc.consumed >= matched.length
              ? acc
              : c === " "
                ? acc
                : { consumed: acc.consumed + 1, end: ci + 1 },
          { consumed: 0, end: 0 },
        ).end;
        if (!INLINE_SEPARATORS.has(chars[labelEnd] ?? "")) return [];
        return [
          {
            category: rule.category,
            lineIdx,
            startPos: pos,
            endPos: pos + 1,
            rect: item.rect,
            inlineValueStart: labelEnd + 1,
          } satisfies LabelHit,
        ];
      }),
    ),
  );

const inlineValueRect = (
  item: PositionedText,
  valueStart: number,
): Rect | null => {
  const charCount = Math.max(Array.from(item.str).length, 1);
  const charW = item.rect.width / charCount;
  const width = item.rect.width - charW * valueStart;
  return width > 0
    ? { x: item.rect.x + charW * valueStart, y: item.rect.y, width, height: item.rect.height }
    : null;
};

const collectRightward = (
  texts: ReadonlyArray<PositionedText>,
  indices: ReadonlyArray<number>,
  hit: LabelHit,
  maxGapX: number,
): ReadonlyArray<PositionedText> => {
  const after = indices.slice(hit.endPos).map((idx) => texts[idx]);
  const stopAt = after.findIndex((t) => isStopWord(t));
  const limited = stopAt === -1 ? after : after.slice(0, stopAt);
  return limited.filter(
    (t) =>
      t.rect.x <= hit.rect.x + hit.rect.width + maxGapX &&
      t.str.trim().length > 0,
  );
};

const collectBelow = (
  texts: ReadonlyArray<PositionedText>,
  lines: ReadonlyArray<ReadonlyArray<number>>,
  hit: LabelHit,
  maxGapX: number,
): ReadonlyArray<PositionedText> => {
  const labelBottom = hit.rect.y + hit.rect.height;
  const searchRect: Rect = {
    x: hit.rect.x,
    y: hit.rect.y,
    width: maxGapX,
    height: hit.rect.height,
  };
  const candidateLines = lines
    .slice(hit.lineIdx + 1)
    .map((indices) =>
      indices
        .map((idx) => texts[idx])
        .filter(
          (t) =>
            xOverlaps(t.rect, searchRect) &&
            !isStopWord(t) &&
            t.str.trim().length > 0,
        ),
    )
    .filter((items) => items.length > 0)
    .map((items) => ({
      items,
      gap: Math.min(...items.map((t) => t.rect.y)) - labelBottom,
    }))
    .filter(
      ({ gap }) => gap >= 0 && gap <= hit.rect.height * MAX_GAP_Y_RATIO,
    );
  const nearest = candidateLines.reduce<
    Readonly<{ items: ReadonlyArray<PositionedText>; gap: number }> | null
  >((best, cur) => (best === null || cur.gap < best.gap ? cur : best), null);
  return nearest?.items ?? [];
};

export const detectByLabel = (
  page: PageData,
  lines: ReadonlyArray<ReadonlyArray<number>>,
  rules: ReadonlyArray<LabelRule> = LABEL_RULES,
): ReadonlyArray<Detection> => {
  const maxGapX = page.width * MAX_GAP_X_RATIO;
  const hits = findLabelHits(page.texts, lines, rules);
  return hits.flatMap((hit) => {
    const indices = lines[hit.lineIdx];
    const right = collectRightward(page.texts, indices, hit, maxGapX);
    const inline =
      hit.inlineValueStart !== null
        ? inlineValueRect(page.texts[indices[hit.startPos]], hit.inlineValueStart)
        : null;
    const rightRects = right
      .filter((t) => yOverlaps(t.rect, hit.rect))
      .map((t) => t.rect);
    const sameRow = [...(inline ? [inline] : []), ...rightRects];
    const valueItems =
      sameRow.length > 0
        ? sameRow
        : collectBelow(page.texts, lines, hit, maxGapX).map((t) => t.rect);
    const rect = unionRects(valueItems);
    if (rect === null) return [];
    const text =
      sameRow.length > 0
        ? right.map((t) => t.str).join("")
        : collectBelow(page.texts, lines, hit, maxGapX)
            .map((t) => t.str)
            .join("");
    return [
      {
        category: hit.category,
        rect: padRect(rect, MASK_PADDING),
        text,
      },
    ];
  });
};
