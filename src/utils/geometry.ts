import type { Rect } from "../types";

export const rectFromPoints = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Rect => ({
  x: Math.min(x1, x2),
  y: Math.min(y1, y2),
  width: Math.abs(x2 - x1),
  height: Math.abs(y2 - y1),
});

export const unionRects = (rects: ReadonlyArray<Rect>): Rect | null => {
  if (rects.length === 0) return null;
  const x1 = Math.min(...rects.map((r) => r.x));
  const y1 = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.width));
  const y2 = Math.max(...rects.map((r) => r.y + r.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
};

export const padRect = (rect: Rect, pad: number): Rect => ({
  x: rect.x - pad,
  y: rect.y - pad,
  width: rect.width + pad * 2,
  height: rect.height + pad * 2,
});

export const clampRect = (rect: Rect, maxWidth: number, maxHeight: number): Rect => {
  const x = Math.max(0, rect.x);
  const y = Math.max(0, rect.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(rect.x + rect.width, maxWidth) - x),
    height: Math.max(0, Math.min(rect.y + rect.height, maxHeight) - y),
  };
};

export const intersectionArea = (a: Rect, b: Rect): number => {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
};

export const iou = (a: Rect, b: Rect): number => {
  const inter = intersectionArea(a, b);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
};
