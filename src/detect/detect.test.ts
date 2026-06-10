import { describe, expect, it } from "vitest";
import { detectAll } from "./detect";
import { makeItem, makePage } from "./testHelpers";

describe("detectAll", () => {
  it("JIS履歴書風レイアウトから複数カテゴリを検出する", () => {
    const page = makePage([
      makeItem("ふりがな", 20, 60),
      makeItem("やまだ たろう", 100, 60),
      makeItem("氏名", 20, 80),
      makeItem("山田 太郎", 100, 80),
      makeItem("生年月日", 20, 110),
      makeItem("1990年4月1日生", 100, 110),
      makeItem("〒150-0001", 20, 140),
      makeItem("東京都渋谷区神宮前1-2-3", 20, 160),
      makeItem("電話", 20, 190),
      makeItem("090-1234-5678", 100, 190),
      makeItem("メール", 20, 220),
      makeItem("taro@example.com", 100, 220),
    ]);
    const masks = detectAll([page]);
    const byCategory = new Map(masks.map((m) => [m.category, m]));
    expect(byCategory.has("furigana")).toBe(true);
    expect(byCategory.has("name")).toBe(true);
    expect(byCategory.has("birthdate")).toBe(true);
    expect(byCategory.has("postalCode")).toBe(true);
    expect(byCategory.has("address")).toBe(true);
    expect(byCategory.has("phone")).toBe(true);
    expect(byCategory.has("email")).toBe(true);
  });

  it("初期状態はすべて enabled で source は auto", () => {
    const page = makePage([makeItem("〒150-0001", 20, 100)]);
    const masks = detectAll([page]);
    expect(masks).toHaveLength(1);
    expect(masks[0].enabled).toBe(true);
    expect(masks[0].source).toBe("auto");
    expect(masks[0].id).toBe("auto-0-0");
  });

  it("マスク矩形はページ境界内にクランプされる", () => {
    // x=0 起点のアイテムはパディングで負座標になるためクランプが効く
    const page = makePage([makeItem("〒150-0001", 0, 0)]);
    const masks = detectAll([page]);
    expect(masks[0].rect.x).toBeGreaterThanOrEqual(0);
    expect(masks[0].rect.y).toBeGreaterThanOrEqual(0);
  });

  it("テキストのないページからは何も検出しない", () => {
    const page = makePage([]);
    expect(detectAll([page])).toEqual([]);
  });
});
