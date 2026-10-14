import { describe, expect, it } from "vitest";
import { loadWarnings } from "./loadWarnings";

describe("loadWarnings", () => {
  it("画像は自動検出できない旨の警告だけを返す", () => {
    const warnings = loadWarnings({ kind: "image", hasText: false, maskCount: 0 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("画像ファイル");
  });

  it("テキストのない PDF はスキャン画像の可能性を伝える", () => {
    const warnings = loadWarnings({ kind: "pdf", hasText: false, maskCount: 0 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("スキャン画像");
  });

  it("テキストはあるが検出 0 件の PDF は手動マスクを促す", () => {
    const warnings = loadWarnings({ kind: "pdf", hasText: true, maskCount: 0 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("自動検出できませんでした");
  });

  it("検出がある PDF は警告なし", () => {
    expect(loadWarnings({ kind: "pdf", hasText: true, maskCount: 3 })).toEqual([]);
  });
});
