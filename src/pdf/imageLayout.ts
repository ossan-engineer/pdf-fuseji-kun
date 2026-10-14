import { MAX_CANVAS_PIXELS } from "./canvasLimits";

// A4(pt)。画像は向きに合わせて A4 に収まるサイズのページとして扱う
const A4_SHORT_PT = 595.28;
const A4_LONG_PT = 841.89;

export type ImageLayout = Readonly<{
  // 中間 PDF のページサイズ(pt)
  pageWidth: number;
  pageHeight: number;
  // 画像を描く canvas のサイズ(px)
  canvasWidth: number;
  canvasHeight: number;
}>;

// 画像のピクセルサイズから、PDF ページのサイズと描画用 canvas のサイズを決める。
// ページは縦横比を保って A4 に収め(PDF 入力と同じ画質設定の dpi になるように)、
// canvas は iOS Safari の面積上限を超えないよう縮小する
export const imageLayout = (widthPx: number, heightPx: number): ImageLayout => {
  const landscape = widthPx > heightPx;
  const boxWidth = landscape ? A4_LONG_PT : A4_SHORT_PT;
  const boxHeight = landscape ? A4_SHORT_PT : A4_LONG_PT;
  const pageScale = Math.min(boxWidth / widthPx, boxHeight / heightPx);
  const pixels = widthPx * heightPx;
  const canvasScale =
    pixels > MAX_CANVAS_PIXELS ? Math.sqrt(MAX_CANVAS_PIXELS / pixels) : 1;
  return {
    pageWidth: widthPx * pageScale,
    pageHeight: heightPx * pageScale,
    canvasWidth: Math.max(1, Math.floor(widthPx * canvasScale)),
    canvasHeight: Math.max(1, Math.floor(heightPx * canvasScale)),
  };
};
