import type { PositionedText } from "../types";
import { padRect } from "../utils/geometry";
import type { AiDetectionItem } from "./aiPrompt";
import { dedupeDetections } from "./detect";
import type { Detection } from "./detectByRegex";
import {
  MASK_PADDING,
  originalTextForRange,
  rectForCharRange,
} from "./detectByRegex";
import type { NormalizedLine } from "./lines";
import { normalizeText } from "./normalize";

// 1 文字の検索語は同字の全出現にマッチして誤マスクが氾濫するため捨てる。
// 1 文字の姓名はラベル検出・手動マスクに委ねる
const MIN_NEEDLE_LENGTH = 2;

const escapeRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 行内の needle 全出現を Detection にする(同一文字列の複数出現も全てマスク)
const findInLine = (
  needle: string,
  category: Detection["category"],
  line: NormalizedLine,
  texts: ReadonlyArray<PositionedText>,
): ReadonlyArray<Detection> =>
  Array.from(
    line.text.matchAll(new RegExp(escapeRegExp(needle), "g")),
  ).flatMap((m) => {
    const start = m.index;
    const end = start + needle.length;
    const rect = rectForCharRange(line, texts, start, end);
    return rect
      ? [
          {
            category,
            rect: padRect(rect, MASK_PADDING),
            text: originalTextForRange(line, texts, start, end),
          },
        ]
      : [];
  });

// AI の出力文字列をページ内テキストへ逆写像する。テキスト中に実在しない
// 出力はハルシネーションとみなして破棄する(座標が取れない以上マスク不能)。
// 行をまたぐ出力には対応しない(プロンプト側で行ごとの抽出を指示している)
export const mapAiItemsToDetections = (
  items: ReadonlyArray<AiDetectionItem>,
  lines: ReadonlyArray<NormalizedLine>,
  texts: ReadonlyArray<PositionedText>,
): ReadonlyArray<Detection> =>
  dedupeDetections(
    items.flatMap((item) => {
      const needle = normalizeText(item.text).trim();
      if (Array.from(needle).length < MIN_NEEDLE_LENGTH) return [];
      const hits = lines.flatMap((line) =>
        findInLine(needle, item.category, line, texts),
      );
      if (hits.length > 0) return hits;
      // 全行 0 ヒットかつ空白を含む場合のみ断片で再検索する。
      // buildNormalizedLine が挿入するセル区切り空白をモデルが
      // 落とす/増やすことがあるため(行跨ぎ結合の救済も兼ねる)
      if (!/\s/.test(needle)) return [];
      return needle
        .split(/\s+/)
        .filter((frag) => Array.from(frag).length >= MIN_NEEDLE_LENGTH)
        .flatMap((frag) =>
          lines.flatMap((line) => findInLine(frag, item.category, line, texts)),
        );
    }),
  );
