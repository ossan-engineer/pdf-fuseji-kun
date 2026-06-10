import type { Detection } from "./detectByRegex";
import type { MaskRegion, PageData } from "../types";
import { clampRect, iou } from "../utils/geometry";
import { detectByLabel } from "./detectByLabel";
import { detectByRegex } from "./detectByRegex";
import { buildNormalizedLine, groupIntoLines } from "./lines";
import { PATTERNS } from "./patterns";

export const DEDUPE_IOU_THRESHOLD = 0.7;

// 重複矩形は先勝ち(ラベル検出を正規表現検出より優先)。AI 検出でも再利用する
export const dedupeDetections = (
  detections: ReadonlyArray<Detection>,
): ReadonlyArray<Detection> =>
  detections.reduce<ReadonlyArray<Detection>>(
    (acc, d) =>
      acc.some((kept) => iou(kept.rect, d.rect) > DEDUPE_IOU_THRESHOLD)
        ? acc
        : [...acc, d],
    [],
  );

export const detectAll = (
  pages: ReadonlyArray<PageData>,
): ReadonlyArray<MaskRegion> =>
  pages.flatMap((page) => {
    const lines = groupIntoLines(page.texts);
    const normalizedLines = lines.map((indices) =>
      buildNormalizedLine(page.texts, indices),
    );
    const labelDetections = detectByLabel(page, lines);
    const regexDetections = normalizedLines.flatMap((line) =>
      detectByRegex(line, page.texts, PATTERNS),
    );
    return dedupeDetections([...labelDetections, ...regexDetections]).map(
      (d, i): MaskRegion => ({
        id: `auto-${page.pageIndex}-${i}`,
        pageIndex: page.pageIndex,
        rect: clampRect(d.rect, page.width, page.height),
        category: d.category,
        source: "auto",
        enabled: true,
        matchedText: d.text,
      }),
    );
  });
