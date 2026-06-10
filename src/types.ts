// 座標系は全レイヤ統一: scale=1 の pdf.js viewport 座標(左上原点・pt 単位)。
// プレビューは displayScale 倍、エクスポートは exportScale 倍するだけで変換不要。
export type Rect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type TextDirection = "ltr" | "rtl" | "ttb";

export type PositionedText = Readonly<{
  str: string;
  rect: Rect;
  hasEOL: boolean;
  dir: TextDirection;
}>;

export type PageData = Readonly<{
  pageIndex: number;
  width: number;
  height: number;
  texts: ReadonlyArray<PositionedText>;
}>;

export type PiiCategory =
  | "name"
  | "furigana"
  | "address"
  | "phone"
  | "email"
  | "postalCode"
  | "birthdate"
  | "manual";

export type MaskRegion = Readonly<{
  id: string;
  pageIndex: number;
  rect: Rect;
  category: PiiCategory;
  source: "auto" | "manual";
  enabled: boolean;
  matchedText: string | null;
}>;

export type AppStatus = "idle" | "loading" | "ready" | "generating" | "error";

// Chrome 内蔵 AI(Prompt API)によるバックグラウンド検出の進行状態。
// "error" でもルールベースの暫定マスクが残るため UI 上はエラー表示しない。
export type AiDetectionStatus = "idle" | "detecting" | "done" | "error";

export type AppState = Readonly<{
  status: AppStatus;
  fileName: string | null;
  pages: ReadonlyArray<PageData>;
  masks: ReadonlyArray<MaskRegion>;
  exportScale: number;
  errorMessage: string | null;
  warnings: ReadonlyArray<string>;
  aiStatus: AiDetectionStatus;
}>;

export const CATEGORY_LABELS: Readonly<Record<PiiCategory, string>> = {
  name: "氏名",
  furigana: "ふりがな",
  address: "住所",
  phone: "電話番号",
  email: "メールアドレス",
  postalCode: "郵便番号",
  birthdate: "生年月日",
  manual: "手動",
};
