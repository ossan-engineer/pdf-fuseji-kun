import { describe, expect, it } from "vitest";
import { detectByLabel } from "./detectByLabel";
import { groupIntoLines } from "./lines";
import { makeItem, makePage } from "./testHelpers";

const run = (page: ReturnType<typeof makePage>) =>
  detectByLabel(page, groupIntoLines(page.texts));

describe("detectByLabel", () => {
  it("「氏名」ラベル右の値をマスクする(ラベル自体は含まない)", () => {
    const page = makePage([
      makeItem("氏名", 20, 100),
      makeItem("山田", 80, 100),
      makeItem("太郎", 120, 100),
    ]);
    const found = run(page);
    expect(found).toHaveLength(1);
    expect(found[0].category).toBe("name");
    // 値の開始(x=80)からパディング 2pt。ラベル(x=20〜40)は含まれない
    expect(found[0].rect.x).toBeCloseTo(78);
    expect(found[0].rect.x + found[0].rect.width).toBeCloseTo(142);
  });

  it("「氏 名」のように字間スペースで分割されたラベルも認識する", () => {
    const page = makePage([
      makeItem("氏", 20, 100),
      makeItem("名", 40, 100),
      makeItem("山田太郎", 80, 100),
    ]);
    const found = run(page);
    expect(found).toHaveLength(1);
    expect(found[0].category).toBe("name");
    expect(found[0].rect.x).toBeCloseTo(78);
  });

  it("「ふりがな」ラベルは furigana カテゴリになる", () => {
    const page = makePage([
      makeItem("ふりがな", 20, 80),
      makeItem("やまだ たろう", 80, 80),
    ]);
    const found = run(page);
    expect(found.map((d) => d.category)).toEqual(["furigana"]);
  });

  it("右に値がなければ直下の行を探す", () => {
    const page = makePage([
      makeItem("氏名", 20, 100),
      makeItem("山田太郎", 20, 115), // ギャップ 5pt < 高さ×3
    ]);
    const found = run(page);
    expect(found).toHaveLength(1);
    expect(found[0].rect.y).toBeCloseTo(113);
  });

  it("別の欄ラベル(生年月日など)で値の収集を打ち切る", () => {
    const page = makePage([
      makeItem("氏名", 20, 100),
      makeItem("山田太郎", 70, 100),
      makeItem("生年月日", 150, 100),
      makeItem("1990年4月1日", 210, 100),
    ]);
    const found = run(page);
    expect(found).toHaveLength(1);
    // 生年月日ラベル以降は含まない
    expect(found[0].rect.x + found[0].rect.width).toBeLessThan(150);
  });

  it("「氏名: 山田太郎」のように同一アイテム内の値もマスクする", () => {
    const page = makePage([makeItem("氏名: 山田太郎", 20, 100)]);
    const found = run(page);
    expect(found).toHaveLength(1);
    // 値部分(4 文字目以降)のみ。1 文字 10pt なので x = 20 + 30 - 2
    expect(found[0].rect.x).toBeCloseTo(48);
  });

  it("ラベルだけで値が見つからない場合は何も検出しない", () => {
    const page = makePage([makeItem("氏名", 20, 100)]);
    expect(run(page)).toEqual([]);
  });

  it("遠すぎる下の行は値とみなさない", () => {
    const page = makePage([
      makeItem("氏名", 20, 100),
      makeItem("関係ない行", 20, 200),
    ]);
    expect(run(page)).toEqual([]);
  });
});
