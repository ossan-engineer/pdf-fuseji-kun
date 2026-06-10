import { describe, expect, it } from "vitest";
import type { AppState, MaskRegion } from "../types";
import { appReducer, initialState } from "./appReducer";

const mask = (
  id: string,
  enabled = true,
  source: MaskRegion["source"] = "manual",
): MaskRegion => ({
  id,
  pageIndex: 0,
  rect: { x: 0, y: 0, width: 10, height: 10 },
  category: "manual",
  source,
  enabled,
  matchedText: null,
});

const readyState: AppState = {
  ...initialState,
  status: "ready",
  masks: [mask("a"), mask("b")],
};

describe("appReducer", () => {
  it("TOGGLE_MASK は対象のみ反転し、元の state を変更しない", () => {
    const next = appReducer(readyState, { type: "TOGGLE_MASK", id: "a" });
    expect(next.masks.map((m) => m.enabled)).toEqual([false, true]);
    expect(readyState.masks.map((m) => m.enabled)).toEqual([true, true]);
    expect(next).not.toBe(readyState);
  });

  it("ADD_MASK は末尾に追加する", () => {
    const next = appReducer(readyState, { type: "ADD_MASK", mask: mask("c") });
    expect(next.masks.map((m) => m.id)).toEqual(["a", "b", "c"]);
    expect(readyState.masks).toHaveLength(2);
  });

  it("REMOVE_MASK は対象を除去する", () => {
    const next = appReducer(readyState, { type: "REMOVE_MASK", id: "a" });
    expect(next.masks.map((m) => m.id)).toEqual(["b"]);
  });

  it("SET_ALL_ENABLED で一括切替できる", () => {
    const next = appReducer(readyState, {
      type: "SET_ALL_ENABLED",
      enabled: false,
    });
    expect(next.masks.every((m) => !m.enabled)).toBe(true);
  });

  it("LOAD_START は exportScale を保持しつつ初期化する", () => {
    const withScale = { ...readyState, exportScale: 3 };
    const next = appReducer(withScale, {
      type: "LOAD_START",
      fileName: "a.pdf",
    });
    expect(next.status).toBe("loading");
    expect(next.fileName).toBe("a.pdf");
    expect(next.masks).toEqual([]);
    expect(next.exportScale).toBe(3);
  });

  it("RESET は初期状態に戻す(exportScale は保持)", () => {
    const next = appReducer({ ...readyState, exportScale: 3 }, { type: "RESET" });
    expect(next.status).toBe("idle");
    expect(next.exportScale).toBe(3);
  });

  it("AI_DETECT_START で aiStatus が detecting になる", () => {
    const next = appReducer(readyState, { type: "AI_DETECT_START" });
    expect(next.aiStatus).toBe("detecting");
    expect(next.masks).toEqual(readyState.masks);
  });

  it("AI_DETECT_SUCCESS は既存マスクを保持し、重複しない AI マスクのみ追加する", () => {
    const state: AppState = {
      ...readyState,
      aiStatus: "detecting",
      masks: [
        mask("auto-0-0", false, "auto"), // OFF 操作した暫定マスクも保持される
        mask("manual-1", true, "manual"),
      ],
    };
    const next = appReducer(state, {
      type: "AI_DETECT_SUCCESS",
      masks: [
        // 既存 auto-0-0 と同一矩形・同一ページ → 重複として捨てる
        mask("ai-0-0", true, "auto"),
        // 重ならない矩形 → 追加される
        {
          ...mask("ai-0-1", true, "auto"),
          rect: { x: 100, y: 100, width: 10, height: 10 },
        },
        // 同一矩形でも別ページなら重複ではない → 追加される
        { ...mask("ai-1-0", true, "auto"), pageIndex: 1 },
      ],
    });
    expect(next.aiStatus).toBe("done");
    expect(next.masks.map((m) => m.id)).toEqual([
      "auto-0-0",
      "manual-1",
      "ai-0-1",
      "ai-1-0",
    ]);
    // OFF 操作が引き継がれている
    expect(next.masks.find((m) => m.id === "auto-0-0")?.enabled).toBe(false);
  });

  it("AI_DETECT_ERROR はマスクを変更せず aiStatus のみ更新する", () => {
    const state: AppState = { ...readyState, aiStatus: "detecting" };
    const next = appReducer(state, { type: "AI_DETECT_ERROR" });
    expect(next.aiStatus).toBe("error");
    expect(next.masks).toEqual(state.masks);
  });

  it("LOAD_START / RESET で aiStatus が idle に戻る", () => {
    const state: AppState = { ...readyState, aiStatus: "done" };
    expect(
      appReducer(state, { type: "LOAD_START", fileName: "a.pdf" }).aiStatus,
    ).toBe("idle");
    expect(appReducer(state, { type: "RESET" }).aiStatus).toBe("idle");
  });
});
