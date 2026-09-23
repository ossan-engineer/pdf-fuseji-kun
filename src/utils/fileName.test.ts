import { describe, expect, it } from "vitest";
import { maskedFileName } from "./fileName";

describe("maskedFileName", () => {
  it("ローカル時刻の日時からゼロ埋めしたファイル名を返す", () => {
    expect(maskedFileName(new Date(2026, 0, 2, 3, 4, 5))).toBe(
      "masked_20260102-030405.pdf",
    );
  });

  it("2 桁の値もそのまま使う", () => {
    expect(maskedFileName(new Date(2026, 11, 31, 23, 59, 58))).toBe(
      "masked_20261231-235958.pdf",
    );
  });
});
