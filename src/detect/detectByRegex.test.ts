import { describe, expect, it } from "vitest";
import type { PiiCategory } from "../types";
import { detectByRegex } from "./detectByRegex";
import { buildNormalizedLine } from "./lines";
import { PATTERNS } from "./patterns";
import { CHAR_WIDTH, makeItem } from "./testHelpers";

// 1 行テキストから検出を実行するヘルパー(1 文字 = 10pt 幅)
const detectIn = (text: string) => {
  const texts = [makeItem(text, 0, 100)];
  const line = buildNormalizedLine(texts, [0]);
  return detectByRegex(line, texts, PATTERNS);
};

const categories = (text: string): ReadonlyArray<PiiCategory> =>
  detectIn(text).map((d) => d.category);

describe("phone", () => {
  it("ハイフン区切りの固定電話を検出する", () => {
    const found = detectIn("TEL: 03-1234-5678");
    expect(found.map((d) => [d.category, d.text])).toEqual([
      ["phone", "03-1234-5678"],
    ]);
  });

  it("全角・長音記号区切りの携帯番号を検出する", () => {
    const found = detectIn("０９０ー１２３４ー５６７８");
    expect(found.map((d) => [d.category, d.text])).toEqual([
      ["phone", "090-1234-5678"],
    ]);
  });

  it("括弧区切りを検出する", () => {
    expect(categories("03(1234)5678")).toEqual(["phone"]);
  });

  it("矩形がマッチ文字位置に対応する(前置ラベルは含まない)", () => {
    const found = detectIn("TEL: 03-1234-5678");
    // マッチ開始は 6 文字目(index 5)。パディング 2pt 込み
    expect(found[0].rect.x).toBeCloseTo(5 * CHAR_WIDTH - 2);
    expect(found[0].rect.width).toBeCloseTo(12 * CHAR_WIDTH + 4);
  });

  it("0 始まりでない数字列は検出しない", () => {
    expect(categories("12-3456-7890")).toEqual([]);
  });
});

describe("postalCode", () => {
  it("〒付きを検出する", () => {
    expect(detectIn("〒150-0001")[0].category).toBe("postalCode");
  });

  it("〒なし XXX-XXXX 形式を検出する", () => {
    expect(categories("150-0001")).toEqual(["postalCode"]);
  });

  it("〒なし 7 桁連続数字は検出しない(口座番号等の誤検出防止)", () => {
    expect(categories("1234567")).toEqual([]);
  });

  it("電話番号の一部を郵便番号と誤検出しない", () => {
    expect(categories("090-1234-5678")).toEqual(["phone"]);
  });
});

describe("email", () => {
  it("メールアドレスを検出する", () => {
    const found = detectIn("mail: taro.yamada@example.co.jp");
    expect(found.map((d) => [d.category, d.text])).toEqual([
      ["email", "taro.yamada@example.co.jp"],
    ]);
  });
});

describe("address", () => {
  it("都道府県から行末までをマスク範囲にする", () => {
    const found = detectIn("住所 東京都渋谷区神宮前1-2-3 コーポ101");
    const address = found.find((d) => d.category === "address");
    expect(address?.text).toBe("東京都渋谷区神宮前1-2-3 コーポ101");
    // 行末まで拡張されている(末尾文字まで含む)
    expect(address && address.rect.x + address.rect.width).toBeCloseTo(
      Array.from("住所 東京都渋谷区神宮前1-2-3 コーポ101").length * CHAR_WIDTH +
        2,
    );
  });

  it("都道府県を含まない行は検出しない", () => {
    expect(categories("永田町1-7-1")).toEqual([]);
  });
});

describe("birthdate", () => {
  it("西暦の生年月日を検出する", () => {
    expect(categories("1990年4月1日生")).toEqual(["birthdate"]);
  });

  it("和暦を検出する", () => {
    expect(categories("平成2年4月1日")).toEqual(["birthdate"]);
    expect(categories("令和元年5月1日")).toEqual(["birthdate"]);
  });

  it("スラッシュ区切りを検出する", () => {
    expect(categories("1990/4/1")).toEqual(["birthdate"]);
  });

  it("職歴の年月(日なし)は検出しない", () => {
    expect(categories("2015年4月 株式会社○○入社")).toEqual([]);
  });
});
