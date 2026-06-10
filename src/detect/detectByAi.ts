import type { MaskRegion, PageData } from "../types";
import { clampRect } from "../utils/geometry";
import { AI_MODEL_OPTIONS } from "./aiAvailability";
import { mapAiItemsToDetections } from "./aiMapping";
import {
  buildPagePrompt,
  parseAiResponse,
  RESPONSE_SCHEMA,
  SYSTEM_PROMPT,
} from "./aiPrompt";
import { buildNormalizedLine, groupIntoLines } from "./lines";

// 1 ページ分を独立したセッションで処理する。clone() で会話文脈を
// 初期化し、前ページの内容が抽出結果へ漏れる(文脈汚染)のを防ぐ
const detectPage = async (
  baseSession: LanguageModel,
  page: PageData,
  signal: AbortSignal,
): Promise<ReadonlyArray<MaskRegion>> => {
  const lines = groupIntoLines(page.texts).map((indices) =>
    buildNormalizedLine(page.texts, indices),
  );
  if (lines.length === 0) return []; // スキャン画像等のテキストなしページ
  const session = await baseSession.clone({ signal });
  try {
    const raw = await session.prompt(buildPagePrompt(lines), {
      responseConstraint: RESPONSE_SCHEMA,
      signal,
    });
    return mapAiItemsToDetections(parseAiResponse(raw), lines, page.texts).map(
      (d, i): MaskRegion => ({
        id: `ai-${page.pageIndex}-${i}`,
        pageIndex: page.pageIndex,
        rect: clampRect(d.rect, page.width, page.height),
        category: d.category,
        // "auto" のままにして既存のトグル・マージ・出力ロジックを共用する
        // (由来は id の "ai-" プレフィックスで判別できる)
        source: "auto",
        enabled: true,
        matchedText: d.text,
      }),
    );
  } finally {
    session.destroy();
  }
};

// Chrome 内蔵 AI(Gemini Nano)で全ページの個人情報を検出する。
// 推論は完全にオンデバイスで実行され、テキストが外部送信されることはない。
// 呼び出し側は isAiDetectionAvailable() を事前に確認すること
export const detectByAi = async (
  pages: ReadonlyArray<PageData>,
  signal: AbortSignal,
): Promise<ReadonlyArray<MaskRegion>> => {
  const baseSession = await LanguageModel.create({
    ...AI_MODEL_OPTIONS,
    initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
    signal,
  });
  try {
    // 履歴書は 1〜3 ページ想定なので並列化せず逐次処理する
    return await pages.reduce<Promise<ReadonlyArray<MaskRegion>>>(
      async (accPromise, page) => {
        const acc = await accPromise;
        return [...acc, ...(await detectPage(baseSession, page, signal))];
      },
      Promise.resolve([]),
    );
  } finally {
    baseSession.destroy();
  }
};
