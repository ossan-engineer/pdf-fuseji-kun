import { describe, expect, it } from "vitest";
import { detectFileKind } from "./fileKind";

describe("detectFileKind", () => {
  it("MIME 型が PDF なら pdf", () => {
    expect(detectFileKind({ type: "application/pdf", name: "resume" })).toBe(
      "pdf",
    );
  });

  it("MIME 型が空でも拡張子 .pdf なら pdf(大文字小文字は区別しない)", () => {
    expect(detectFileKind({ type: "", name: "RESUME.PDF" })).toBe("pdf");
  });

  it.each(["image/jpeg", "image/png", "image/gif"])(
    "MIME 型 %s は image",
    (type) => {
      expect(detectFileKind({ type, name: "photo" })).toBe("image");
    },
  );

  it.each(["a.jpg", "a.JPEG", "a.png", "a.gif"])(
    "MIME 型が空でも拡張子 %s なら image",
    (name) => {
      expect(detectFileKind({ type: "", name })).toBe("image");
    },
  );

  it("対象外の形式は null", () => {
    expect(detectFileKind({ type: "image/webp", name: "a.webp" })).toBeNull();
    expect(detectFileKind({ type: "text/plain", name: "a.txt" })).toBeNull();
  });
});
