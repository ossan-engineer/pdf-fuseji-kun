import { jsPDF } from "jspdf";
// Node 環境では legacy ビルドが必要(modern ビルドは DOMMatrix 等のブラウザ API 前提)
import { getDocument, Util } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { detectAll } from "../detect/detect";
import type { PageData, PositionedText, TextDirection } from "../types";

// loadPdf.ts は worker の ?url import を含みブラウザ前提のため、
// 抽出ロジックと同一の座標変換をここで再現して実 PDF に対する
// 検出パイプライン(座標変換 → 行結合 → 検出)を検証する。
// ※ jsPDF の標準フォントは日本語非対応のため ASCII で表現できる
//   電話番号・メール・郵便番号のみ対象。日本語はユニットテストでカバー。
const toDirection = (dir: string): TextDirection =>
  dir === "ttb" || dir === "rtl" ? dir : "ltr";

const extractPages = async (data: ArrayBuffer): Promise<ReadonlyArray<PageData>> => {
  const doc = await getDocument({ data }).promise;
  return Promise.all(
    Array.from({ length: doc.numPages }, async (_, i) => {
      const page = await doc.getPage(i + 1);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const texts = content.items.flatMap(
        (item): ReadonlyArray<PositionedText> => {
          if (!("str" in item) || item.str.length === 0) return [];
          const tx = Util.transform(viewport.transform, item.transform);
          const fontHeight = Math.hypot(tx[2], tx[3]);
          return [
            {
              str: item.str,
              rect: {
                x: tx[4],
                y: tx[5] - fontHeight,
                width: item.width,
                height: fontHeight,
              },
              hasEOL: item.hasEOL,
              dir: toDirection(item.dir),
            },
          ];
        },
      );
      return { pageIndex: i, width: viewport.width, height: viewport.height, texts };
    }),
  );
};

const buildSamplePdf = (): ArrayBuffer => {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  pdf.text("Resume", 40, 60);
  pdf.text("TEL: 090-1234-5678", 40, 100);
  pdf.text("Email: taro.yamada@example.co.jp", 40, 130);
  pdf.text("Postal: 150-0001", 40, 160);
  pdf.text("Joined in 2015", 40, 190);
  return pdf.output("arraybuffer");
};

describe("実PDFに対する検出パイプライン", () => {
  it("生成したPDFから電話・メール・郵便番号を検出し、矩形がテキスト位置と整合する", async () => {
    const pages = await extractPages(buildSamplePdf());
    expect(pages).toHaveLength(1);
    expect(pages[0].texts.length).toBeGreaterThan(0);

    const masks = detectAll(pages);
    const categories = new Set(masks.map((m) => m.category));
    expect(categories.has("phone")).toBe(true);
    expect(categories.has("email")).toBe(true);
    expect(categories.has("postalCode")).toBe(true);
    // "Joined in 2015" 等からの誤検出がない
    expect(masks).toHaveLength(3);

    // 矩形の妥当性: ページ内に収まり、対応する行の y 位置(pt)とおおよそ一致
    const phone = masks.find((m) => m.category === "phone");
    expect(phone).toBeDefined();
    if (phone !== undefined) {
      expect(phone.rect.x).toBeGreaterThan(40);
      expect(phone.rect.x).toBeLessThan(pages[0].width);
      // jsPDF の y=100 はベースライン。マスクはその少し上から始まる
      expect(phone.rect.y).toBeGreaterThan(80);
      expect(phone.rect.y).toBeLessThan(105);
      expect(phone.matchedText).toBe("090-1234-5678");
    }
  });
});
