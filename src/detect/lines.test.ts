import { describe, expect, it } from "vitest";
import { buildNormalizedLine, groupIntoLines } from "./lines";
import { makeItem } from "./testHelpers";

describe("groupIntoLines", () => {
  it("細切れアイテムを 1 行に結合し x 順に並べる", () => {
    const texts = [
      makeItem("太", 40, 100),
      makeItem("山", 0, 100),
      makeItem("郎", 60, 101), // 微小な y ずれは同一行
      makeItem("田", 20, 99),
    ];
    expect(groupIntoLines(texts)).toEqual([[1, 3, 0, 2]]);
  });

  it("y が離れたアイテムは別の行になり、行は y 順", () => {
    const texts = [
      makeItem("下の行", 0, 200),
      makeItem("上の行", 0, 100),
    ];
    expect(groupIntoLines(texts)).toEqual([[1], [0]]);
  });

  it("縦書きと空白のみのアイテムは除外する", () => {
    const texts = [
      makeItem("縦", 0, 100, { dir: "ttb" }),
      makeItem("  ", 20, 100),
      makeItem("横", 40, 100),
    ];
    expect(groupIntoLines(texts)).toEqual([[2]]);
  });
});

describe("buildNormalizedLine", () => {
  it("アイテムを結合し正規化したテキストと charMap を返す", () => {
    const texts = [makeItem("０３-", 0, 100), makeItem("１２３４", 30, 100)];
    const line = buildNormalizedLine(texts, [0, 1]);
    expect(line.text).toBe("03-1234");
    expect(line.charMap[0]).toEqual({ itemIndex: 0, charIndex: 0 });
    expect(line.charMap[3]).toEqual({ itemIndex: 1, charIndex: 0 });
    expect(line.charMap[6]).toEqual({ itemIndex: 1, charIndex: 3 });
  });

  it("大きな x ギャップには区切り空白を挿入する(charMap は null)", () => {
    // アイテム高 10pt、ギャップ 50pt > 高さ×2
    const texts = [makeItem("左", 0, 100), makeItem("右", 60, 100)];
    const line = buildNormalizedLine(texts, [0, 1]);
    expect(line.text).toBe("左 右");
    expect(line.charMap[1]).toBeNull();
  });

  it("隣接アイテム間には空白を挿入しない", () => {
    const texts = [makeItem("03", 0, 100), makeItem("-1234", 20, 100)];
    expect(buildNormalizedLine(texts, [0, 1]).text).toBe("03-1234");
  });
});
