import {
  getDocument,
  Util,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import "./pdfjsSetup";
import type { PageData, PositionedText, TextDirection } from "../types";

export type LoadedPdf = Readonly<{
  doc: PDFDocumentProxy;
  pages: ReadonlyArray<PageData>;
}>;

const toDirection = (dir: string): TextDirection =>
  dir === "ttb" || dir === "rtl" ? dir : "ltr";

// TextItem の transform(左下原点)を scale=1 viewport の左上原点座標へ変換する。
// 以降の全レイヤはこの座標系だけを扱う。
const extractPage = async (
  doc: PDFDocumentProxy,
  pageIndex: number,
): Promise<PageData> => {
  const page = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const texts = content.items.flatMap((item): ReadonlyArray<PositionedText> => {
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
  });
  return { pageIndex, width: viewport.width, height: viewport.height, texts };
};

export const loadPdf = async (file: File): Promise<LoadedPdf> => {
  const data = await file.arrayBuffer();
  const doc = await getDocument({ data }).promise;
  const pages = await Promise.all(
    Array.from({ length: doc.numPages }, (_, i) => extractPage(doc, i)),
  );
  return { doc, pages };
};
