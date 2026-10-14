import { jsPDF } from "jspdf";
import { imageLayout } from "./imageLayout";

const JPEG_QUALITY = 0.92;

const decodeImage = async (file: File): Promise<HTMLImageElement> => {
  const url = URL.createObjectURL(file);
  try {
    const img = document.createElement("img");
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw Object.assign(new Error("画像をデコードできませんでした"), {
      name: "ImageDecodeError",
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

// 画像 1 枚を 1 ページの PDF に変換する。以降は PDF 入力と同じ経路
// (pdf.js でのプレビュー・黒塗り済みラスタ画像での再生成)で扱う。
// GIF アニメーションは先頭フレームだけが描かれる
export const imageToPdf = async (file: File): Promise<ArrayBuffer> => {
  const img = await decodeImage(file);
  const layout = imageLayout(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("canvas の 2D コンテキストを取得できませんでした");
  // 透過 PNG / GIF は JPEG 化で透過部分が黒くなるため、先に白で塗る
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // jsPDF はコンストラクタ必須のライブラリのため new はここに隔離する
  const pdf = new jsPDF({
    unit: "pt",
    format: [layout.pageWidth, layout.pageHeight],
    orientation: layout.pageWidth > layout.pageHeight ? "landscape" : "portrait",
  });
  pdf.addImage(
    canvas.toDataURL("image/jpeg", JPEG_QUALITY),
    "JPEG",
    0,
    0,
    layout.pageWidth,
    layout.pageHeight,
  );
  return pdf.output("arraybuffer");
};
