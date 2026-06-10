// availability() と create() に同じオプションを渡すことで、
// 日本語入出力に対応したモデルの可用性を正確に判定する
export const AI_MODEL_OPTIONS: LanguageModelCreateCoreOptions = {
  expectedInputs: [{ type: "text", languages: ["ja"] }],
  expectedOutputs: [{ type: "text", languages: ["ja"] }],
};

// Chrome 内蔵 AI(Prompt API)が即時利用可能かを判定する。
// "downloadable" / "downloading" はモデル未取得なのでルールベース検出に
// フォールバックする(数 GB のモデルダウンロードを勝手に誘発しない)
export const isAiDetectionAvailable = async (): Promise<boolean> => {
  if (!("LanguageModel" in globalThis)) return false;
  try {
    return (await LanguageModel.availability(AI_MODEL_OPTIONS)) === "available";
  } catch {
    return false;
  }
};
