import type { FileKind } from "./fileKind";

type Params = Readonly<{
  kind: FileKind;
  hasText: boolean;
  maskCount: number;
}>;

// 読み込み後に表示する警告文を組み立てる
export const loadWarnings = ({
  kind,
  hasText,
  maskCount,
}: Params): ReadonlyArray<string> => {
  if (kind === "image") {
    return [
      "画像ファイルは文字を読み取れないため、自動検出は使えません。プレビューをドラッグして手動でマスクしてください。",
    ];
  }
  if (!hasText) {
    return [
      "テキストを抽出できませんでした(スキャン画像の PDF の可能性があります)。自動検出は使えないため、プレビューをドラッグして手動でマスクしてください。",
    ];
  }
  if (maskCount === 0) {
    return [
      "個人情報を自動検出できませんでした。プレビューをドラッグして手動でマスクを追加してください。",
    ];
  }
  return [];
};
