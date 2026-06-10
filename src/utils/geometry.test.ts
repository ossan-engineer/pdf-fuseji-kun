import { describe, expect, it } from "vitest";
import {
  clampRect,
  iou,
  padRect,
  rectFromPoints,
  unionRects,
} from "./geometry";

describe("rectFromPoints", () => {
  it("どの方向のドラッグでも正規化された矩形を返す", () => {
    expect(rectFromPoints(10, 20, 5, 8)).toEqual({
      x: 5,
      y: 8,
      width: 5,
      height: 12,
    });
  });
});

describe("unionRects", () => {
  it("空配列は null", () => {
    expect(unionRects([])).toBeNull();
  });

  it("複数矩形の外接矩形を返す", () => {
    expect(
      unionRects([
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 5, width: 10, height: 10 },
      ]),
    ).toEqual({ x: 0, y: 0, width: 30, height: 15 });
  });
});

describe("padRect", () => {
  it("四方に指定分広げる", () => {
    expect(padRect({ x: 10, y: 10, width: 5, height: 5 }, 2)).toEqual({
      x: 8,
      y: 8,
      width: 9,
      height: 9,
    });
  });
});

describe("clampRect", () => {
  it("ページ境界内に収める", () => {
    expect(clampRect({ x: -5, y: -5, width: 20, height: 200 }, 100, 100)).toEqual({
      x: 0,
      y: 0,
      width: 15,
      height: 100,
    });
  });
});

describe("iou", () => {
  it("同一矩形は 1", () => {
    const r = { x: 0, y: 0, width: 10, height: 10 };
    expect(iou(r, r)).toBe(1);
  });

  it("非交差は 0", () => {
    expect(
      iou(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 100, y: 100, width: 10, height: 10 },
      ),
    ).toBe(0);
  });

  it("半分重なりは 1/3", () => {
    expect(
      iou(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 0, width: 10, height: 10 },
      ),
    ).toBeCloseTo(1 / 3);
  });
});
