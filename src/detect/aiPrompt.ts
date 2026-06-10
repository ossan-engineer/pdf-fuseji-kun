import type { PiiCategory } from "../types";
import type { NormalizedLine } from "./lines";

export type AiPiiCategory = Exclude<PiiCategory, "manual">;

export type AiDetectionItem = Readonly<{
  text: string;
  category: AiPiiCategory;
}>;

export const AI_CATEGORIES: ReadonlyArray<AiPiiCategory> = [
  "name",
  "furigana",
  "address",
  "phone",
  "email",
  "postalCode",
  "birthdate",
];

// 「一字一句そのまま」「行ごとに分けて抽出」は、出力文字列を行テキストへ
// indexOf で逆写像して座標を得るための成立条件(aiMapping.ts 参照)
export const SYSTEM_PROMPT = `あなたは日本語の履歴書・職務経歴書から個人情報を抽出する分類器です。
与えられたテキストから、次のカテゴリに該当する箇所をすべて抽出してください。

- name: 氏名(本人および家族・緊急連絡先の人名)
- furigana: 氏名のふりがな・フリガナ
- address: 住所(都道府県から建物名・部屋番号まで)
- phone: 電話番号・FAX番号・携帯番号
- email: メールアドレス
- postalCode: 郵便番号
- birthdate: 生年月日(年齢表記を含む)

ルール:
- text は与えられたテキストに一字一句そのまま含まれる部分文字列にすること(言い換え・要約・省略・別行の結合をしない)
- テキストは行ごとに改行で区切られている。複数行にまたがる情報は行ごとに分けて抽出すること
- 該当がなければ空の配列を返すこと`;

// session.prompt() の responseConstraint に渡す JSON Schema
export const RESPONSE_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      text: { type: "string" },
      category: { type: "string", enum: [...AI_CATEGORIES] },
    },
    required: ["text", "category"],
    additionalProperties: false,
  },
} as const;

// 正規化済みの行テキストをそのまま渡すことで、モデル出力と
// 逆写像時の検索対象(line.text)のアルファベットを揃える
export const buildPagePrompt = (
  lines: ReadonlyArray<NormalizedLine>,
): string => lines.map((l) => l.text).join("\n");

const isAiCategory = (value: unknown): value is AiPiiCategory =>
  typeof value === "string" && AI_CATEGORIES.includes(value as AiPiiCategory);

// responseConstraint があっても出力を信用せず防御的にパースする。
// 壊れた JSON・非配列・型不一致の要素は捨てる(throw しない)
export const parseAiResponse = (raw: string): ReadonlyArray<AiDetectionItem> => {
  const parsed: unknown = (() => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })();
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item: unknown): ReadonlyArray<AiDetectionItem> => {
    if (typeof item !== "object" || item === null) return [];
    const { text, category } = item as Record<string, unknown>;
    return typeof text === "string" && isAiCategory(category)
      ? [{ text, category }]
      : [];
  });
};
