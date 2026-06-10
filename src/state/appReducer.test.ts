import { describe, expect, it } from "vitest";
import type { AppState, MaskRegion } from "../types";
import { appReducer, initialState } from "./appReducer";

const mask = (id: string, enabled = true): MaskRegion => ({
  id,
  pageIndex: 0,
  rect: { x: 0, y: 0, width: 10, height: 10 },
  category: "manual",
  source: "manual",
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
});
