import { jsPDF } from "jspdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { MaskRegion, PageData } from "../types";
import { renderPageToCanvas } from "./renderPage";

const JPEG_QUALITY = 0.85;
// iOS Safari の canvas 面積上限の目安(4096×4096)。超える場合は scale を自動減衰
const MAX_CANVAS_PIXELS = 16_777_216;

const clampedScale = (page: PageData, scale: number): number => {
  const pixels = page.width * page.height * scale * scale;
  return pixels > MAX_CANVAS_PIXELS
    ? Math.sqrt(MAX_CANVAS_PIXELS / (page.width * page.height))
    : scale;
};

const orientation = (page: PageData): "portrait" | "landscape" =>
  page.width > page.height ? "landscape" : "portrait";

// 真の墨消しの担保点: 黒塗り済み canvas のラスタ画像「だけ」を新規 PDF に
// 埋め込む。元 PDF のテキスト・フォント・メタデータは一切コピーしないため、
// マスク下の情報は出力 PDF に存在しない。
export const generateMaskedPdf = async (
  doc: PDFDocumentProxy,
  pages: ReadonlyArray<PageData>,
  masks: ReadonlyArray<MaskRegion>,
  exportScale: number,
): Promise<Blob> => {
  if (pages.length === 0) throw new Error("ページがありません");
  // jsPDF はコンストラクタ必須のライブラリのため new はここに隔離する
  const pdf = new jsPDF({
    unit: "pt",
    format: [pages[0].width, pages[0].height],
    orientation: orientation(pages[0]),
  });
  const enabledMasks = masks.filter((m) => m.enabled);

  for (const pageData of pages) {
    const page = await doc.getPage(pageData.pageIndex + 1);
    const scale = clampedScale(pageData, exportScale);
    const canvas = document.createElement("canvas");
    await renderPageToCanvas(page, canvas, scale).promise;

    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("canvas の 2D コンテキストを取得できませんでした");
    ctx.fillStyle = "#000000";
    enabledMasks
      .filter((m) => m.pageIndex === pageData.pageIndex)
      .forEach((m) => {
        // 整数ピクセルへ外側スナップ(縁の滲み残り防止)
        const x = Math.floor(m.rect.x * scale);
        const y = Math.floor(m.rect.y * scale);
        const right = Math.ceil((m.rect.x + m.rect.width) * scale);
        const bottom = Math.ceil((m.rect.y + m.rect.height) * scale);
        ctx.fillRect(x, y, right - x, bottom - y);
      });

    if (pageData.pageIndex > 0) {
      pdf.addPage([pageData.width, pageData.height], orientation(pageData));
    }
    pdf.addImage(
      canvas.toDataURL("image/jpeg", JPEG_QUALITY),
      "JPEG",
      0,
      0,
      pageData.width,
      pageData.height,
    );
  }
  return pdf.output("blob");
};
