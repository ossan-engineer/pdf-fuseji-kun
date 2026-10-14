import { describe, expect, it } from "vitest";
import { MAX_CANVAS_PIXELS } from "./canvasLimits";
import { imageLayout } from "./imageLayout";

describe("imageLayout", () => {
  it("縦長の画像は縦向き A4 に縦横比を保って収める", () => {
    const layout = imageLayout(1000, 2000);
    expect(layout.pageHeight).toBeCloseTo(841.89);
    expect(layout.pageWidth).toBeCloseTo(841.89 / 2);
  });

  it("横長の画像は横向き A4 に収める", () => {
    const layout = imageLayout(3000, 1000);
    expect(layout.pageWidth).toBeCloseTo(841.89);
    expect(layout.pageHeight).toBeCloseTo(841.89 / 3);
  });

  it("小さい画像も A4 サイズまで拡大する", () => {
    const layout = imageLayout(595.28, 841.89);
    expect(layout.pageWidth).toBeCloseTo(595.28);
    expect(layout.pageHeight).toBeCloseTo(841.89);
  });

  it("canvas の面積上限以内なら元のピクセルサイズのまま", () => {
    const layout = imageLayout(3024, 4032);
    expect(layout.canvasWidth).toBe(3024);
    expect(layout.canvasHeight).toBe(4032);
  });

  it("canvas の面積上限を超える画像は縦横比を保って縮小する", () => {
    const layout = imageLayout(8000, 6000);
    expect(layout.canvasWidth * layout.canvasHeight).toBeLessThanOrEqual(
      MAX_CANVAS_PIXELS,
    );
    expect(layout.canvasWidth / layout.canvasHeight).toBeCloseTo(8000 / 6000, 2);
  });
});
