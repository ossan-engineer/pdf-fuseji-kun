import { describe, expect, it } from "vitest";
import { normalizeChar, normalizeText } from "./normalize";

describe("normalizeText", () => {
  it("全角英数を半角に変換する", () => {
    expect(normalizeText("０９０ＡＢＣａｂｃ")).toBe("090ABCabc");
  });

  it("ハイフン異体字をすべて - に統一する", () => {
    expect(normalizeText("ー−‐–—―ｰ－〜～")).toBe("----------");
  });

  it("全角スペースを半角に変換する", () => {
    expect(normalizeText("山田　太郎")).toBe("山田 太郎");
  });

  it("全角コロン・括弧を半角化する", () => {
    expect(normalizeText("ＴＥＬ：（０３）")).toBe("TEL:(03)");
  });

  it("漢字・ひらがな・カタカナは変更しない", () => {
    expect(normalizeText("東京都渋谷区ふりがなフリガナ")).toBe(
      "東京都渋谷区ふりがなフリガナ",
    );
  });

  it("1文字入力は必ず1文字を返す(逆写像の前提)", () => {
    const samples = ["Ａ", "ー", "　", "あ", "漢", "1", "@"];
    samples.forEach((ch) => {
      expect(Array.from(normalizeChar(ch)).length).toBe(1);
    });
  });
});
