import type { PiiCategory } from "../types";

export type PatternDef = Readonly<{
  category: PiiCategory;
  regex: RegExp; // g フラグ必須(matchAll で使用)
  // 住所欄は行全体が住所のため、マッチ開始から行末までマスク範囲を拡張する
  extendToLineEnd: boolean;
}>;

const PREFECTURES =
  "北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県";

export const PATTERNS: ReadonlyArray<PatternDef> = [
  {
    category: "email",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    extendToLineEnd: false,
  },
  {
    category: "phone",
    regex: /(?<![\d-])0\d{1,3}[-(]?\d{1,4}[-)]?\d{3,4}(?![\d-])/g,
    extendToLineEnd: false,
  },
  {
    // 誤検出防止のため「〒前置」または「XXX-XXXX 形式」のみ対象
    category: "postalCode",
    regex: /(?:〒\s?\d{3}-?\d{4}|(?<![\d-])\d{3}-\d{4})(?![-\d])/g,
    extendToLineEnd: false,
  },
  {
    category: "address",
    regex: new RegExp(`(?:${PREFECTURES})[^\\s]{1,40}`, "g"),
    extendToLineEnd: true,
  },
  {
    // 「日」まで要求することで職歴の年月(2015年4月〜)を誤検出しない
    category: "birthdate",
    regex: /(?:19|20)\d{2}\s?年\s?\d{1,2}\s?月\s?\d{1,2}\s?日\s?生?/g,
    extendToLineEnd: false,
  },
  {
    category: "birthdate",
    regex: /(?:明治|大正|昭和|平成|令和)\s?(?:\d{1,2}|元)\s?年\s?\d{1,2}\s?月\s?\d{1,2}\s?日\s?生?/g,
    extendToLineEnd: false,
  },
  {
    category: "birthdate",
    regex: /(?<![\d./-])(?:19|20)\d{2}[/.]\d{1,2}[/.]\d{1,2}(?![\d./-])/g,
    extendToLineEnd: false,
  },
];
