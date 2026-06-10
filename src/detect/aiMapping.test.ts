import { describe, expect, it } from "vitest";
import type { PositionedText } from "../types";
import { mapAiItemsToDetections } from "./aiMapping";
import type { AiDetectionItem } from "./aiPrompt";
import { buildNormalizedLine, groupIntoLines } from "./lines";
import { CHAR_WIDTH, makeItem } from "./testHelpers";

// 複数行テキストから NormalizedLine 群を作るヘルパー(1 文字 = 10pt 幅)
const setup = (rows: ReadonlyArray<string>) => {
  const texts: ReadonlyArray<PositionedText> = rows.map((str, i) =>
    makeItem(str, 0, i * 20),
  );
  const lines = groupIntoLines(texts).map((indices) =>
    buildNormalizedLine(texts, indices),
  );
  return { texts, lines };
};

const item = (
  text: string,
  category: AiDetectionItem["category"] = "name",
): AiDetectionItem => ({ text, category });

describe("mapAiItemsToDetections", () => {
  it("完全一致した文字列を矩形化する(パディング 2pt 込み)", () => {
    const { texts, lines } = setup(["氏名 山田太郎"]);
    const found = mapAiItemsToDetections([item("山田太郎")], lines, texts);
    expect(found).toHaveLength(1);
    expect(found[0].category).toBe("name");
    expect(found[0].text).toBe("山田太郎");
    // 「山」は 4 文字目(index 3)から
    expect(found[0].rect.x).toBeCloseTo(3 * CHAR_WIDTH - 2);
    expect(found[0].rect.width).toBeCloseTo(4 * CHAR_WIDTH + 4);
  });

  it("全角の AI 出力でも正規化済み行にマッチする(表示テキストは元のまま)", () => {
    const { texts, lines } = setup(["０９０ー１２３４ー５６７８"]);
    const found = mapAiItemsToDetections(
      [item("０９０ー１２３４ー５６７８", "phone")],
      lines,
      texts,
    );
    expect(found).toHaveLength(1);
    expect(found[0].text).toBe("０９０ー１２３４ー５６７８");
  });

  it("同一文字列の複数出現を全てマスクする", () => {
    const { texts, lines } = setup(["山田太郎", "本人 山田太郎"]);
    const found = mapAiItemsToDetections([item("山田太郎")], lines, texts);
    expect(found).toHaveLength(2);
  });

  it("テキスト中に実在しない出力は破棄する(ハルシネーションガード)", () => {
    const { texts, lines } = setup(["氏名 山田太郎"]);
    expect(
      mapAiItemsToDetections([item("鈴木一郎")], lines, texts),
    ).toEqual([]);
  });

  it("1 文字の出力は破棄する", () => {
    const { texts, lines } = setup(["氏名 山田太郎"]);
    expect(mapAiItemsToDetections([item("山")], lines, texts)).toEqual([]);
  });

  it("全体で不一致でも空白区切りの断片で再検索する", () => {
    // 行内のセル区切り空白量がモデル出力とズレたケースを想定
    const { texts, lines } = setup(["山田  太郎"]);
    const found = mapAiItemsToDetections([item("山田 太郎")], lines, texts);
    expect(found).toHaveLength(2);
    expect(found.map((d) => d.text)).toEqual(["山田", "太郎"]);
  });

  it("重複する検出は IOU で除去する", () => {
    const { texts, lines } = setup(["taro@example.com"]);
    const found = mapAiItemsToDetections(
      [item("taro@example.com", "email"), item("taro@example.com", "email")],
      lines,
      texts,
    );
    expect(found).toHaveLength(1);
  });

  it("空入力は空配列を返す", () => {
    const { texts, lines } = setup(["氏名 山田太郎"]);
    expect(mapAiItemsToDetections([], lines, texts)).toEqual([]);
    expect(mapAiItemsToDetections([item("山田太郎")], [], [])).toEqual([]);
  });
});
