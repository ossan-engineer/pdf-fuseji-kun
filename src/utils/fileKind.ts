export type FileKind = "pdf" | "image";

type FileLike = Readonly<{ type: string; name: string }>;

const IMAGE_MIME_TYPES: ReadonlyArray<string> = [
  "image/jpeg",
  "image/png",
  "image/gif",
];
const IMAGE_EXTENSIONS: ReadonlyArray<string> = [".jpg", ".jpeg", ".png", ".gif"];

// <input type="file"> の accept 属性。MIME 型が空になる環境に備えて拡張子も並べる
export const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  ".pdf",
  ...IMAGE_MIME_TYPES,
  ...IMAGE_EXTENSIONS,
].join(",");

// 受け付けるファイルの種類を判定する。対象外なら null
export const detectFileKind = (file: FileLike): FileKind | null => {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    IMAGE_MIME_TYPES.includes(file.type) ||
    IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))
  ) {
    return "image";
  }
  return null;
};
