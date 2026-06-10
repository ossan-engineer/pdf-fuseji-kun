import type { PDFPageProxy, RenderTask } from "pdfjs-dist";

// プレビュー / エクスポート共用のページ描画。
// 呼び出し側は返り値の RenderTask で cancel / 完了待ちできる
export const renderPageToCanvas = (
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number,
): RenderTask => {
  const viewport = page.getViewport({ scale });
  const width = Math.round(viewport.width);
  const height = Math.round(viewport.height);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return page.render({ canvas, viewport });
};
