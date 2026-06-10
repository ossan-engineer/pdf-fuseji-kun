import type { PiiCategory, PositionedText, Rect } from "../types";
import { padRect, unionRects } from "../utils/geometry";
import type { NormalizedLine } from "./lines";
import type { PatternDef } from "./patterns";

export type Detection = Readonly<{
  category: PiiCategory;
  rect: Rect;
  text: string;
}>;

export const MASK_PADDING = 2;

// アイテム内の 1 文字分の矩形(幅は文字数で按分)
const charRect = (item: PositionedText, charIndex: number): Rect => {
  const charCount = Math.max(Array.from(item.str).length, 1);
  const w = item.rect.width / charCount;
  return {
    x: item.rect.x + w * charIndex,
    y: item.rect.y,
    width: w,
    height: item.rect.height,
  };
};

export const rectForCharRange = (
  line: NormalizedLine,
  texts: ReadonlyArray<PositionedText>,
  start: number,
  end: number,
): Rect | null => {
  const rects = line.charMap
    .slice(start, end)
    .flatMap((origin) =>
      origin ? [charRect(texts[origin.itemIndex], origin.charIndex)] : [],
    );
  return unionRects(rects);
};

export const detectByRegex = (
  line: NormalizedLine,
  texts: ReadonlyArray<PositionedText>,
  patterns: ReadonlyArray<PatternDef>,
): ReadonlyArray<Detection> =>
  patterns.flatMap((pattern) =>
    Array.from(line.text.matchAll(pattern.regex)).flatMap((m) => {
      const start = m.index;
      const end = pattern.extendToLineEnd
        ? line.text.length
        : start + m[0].length;
      const rect = rectForCharRange(line, texts, start, end);
      return rect
        ? [
            {
              category: pattern.category,
              rect: padRect(rect, MASK_PADDING),
              text: line.text.slice(start, end),
            },
          ]
        : [];
    }),
  );
