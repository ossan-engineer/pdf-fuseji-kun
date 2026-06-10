import { describe, expect, it } from "vitest";
import { buildPagePrompt, parseAiResponse } from "./aiPrompt";
import { buildNormalizedLine } from "./lines";
import { makeItem } from "./testHelpers";

describe("buildPagePrompt", () => {
  it("正規化済みの行テキストを改行で結合する", () => {
    const texts = [makeItem("氏名 山田太郎", 0, 0), makeItem("ＴＥＬ", 0, 20)];
    const lines = [
      buildNormalizedLine(texts, [0]),
      buildNormalizedLine(texts, [1]),
    ];
    expect(buildPagePrompt(lines)).toBe("氏名 山田太郎\nTEL");
  });
});

describe("parseAiResponse", () => {
  it("正常な配列をパースする", () => {
    const raw = JSON.stringify([
      { text: "山田太郎", category: "name" },
      { text: "090-1234-5678", category: "phone" },
    ]);
    expect(parseAiResponse(raw)).toEqual([
      { text: "山田太郎", category: "name" },
      { text: "090-1234-5678", category: "phone" },
    ]);
  });

  it("壊れた JSON は空配列を返す", () => {
    expect(parseAiResponse("{oops")).toEqual([]);
  });

  it("配列でない JSON は空配列を返す", () => {
    expect(parseAiResponse('{"text":"a","category":"name"}')).toEqual([]);
  });

  it("未知カテゴリ・型不一致の要素は除外する", () => {
    const raw = JSON.stringify([
      { text: "山田太郎", category: "name" },
      { text: "なにか", category: "salary" },
      { text: 123, category: "phone" },
      { category: "email" },
      null,
    ]);
    expect(parseAiResponse(raw)).toEqual([
      { text: "山田太郎", category: "name" },
    ]);
  });
});
