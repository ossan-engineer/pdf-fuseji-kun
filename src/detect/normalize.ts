// 検出用の文字正規化。「1 入力文字(コードポイント)→ 1 出力文字」を必ず守ることで、
// マッチ位置から元テキストの座標への逆写像を成立させる(NFKC 一括変換は使わない)。
const HYPHEN_VARIANTS: ReadonlySet<string> = new Set([
  "ー", // 長音記号(電話番号の区切りとして頻出)
  "−",
  "‐",
  "‑",
  "–",
  "—",
  "―",
  "ｰ",
  "〜",
  "～",
  "~",
]);

export const normalizeChar = (ch: string): string => {
  const code = ch.codePointAt(0) ?? 0;
  // 全角チルダ(U+FF5E)を「~」にしないよう、ハイフン統一を先に判定する
  if (HYPHEN_VARIANTS.has(ch)) return "-";
  // 全角英数記号(！〜｝)→ 半角
  if (code >= 0xff01 && code <= 0xff5e) {
    return String.fromCodePoint(code - 0xfee0);
  }
  if (ch === "　") return " ";
  return ch;
};

export const normalizeText = (text: string): string =>
  Array.from(text).map(normalizeChar).join("");
