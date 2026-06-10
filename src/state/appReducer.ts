import { DEDUPE_IOU_THRESHOLD } from "../detect/detect";
import type { AppState, MaskRegion, PageData } from "../types";
import { iou } from "../utils/geometry";

export type AppAction =
  | Readonly<{ type: "LOAD_START"; fileName: string }>
  | Readonly<{
      type: "LOAD_SUCCESS";
      pages: ReadonlyArray<PageData>;
      masks: ReadonlyArray<MaskRegion>;
      warnings: ReadonlyArray<string>;
    }>
  | Readonly<{ type: "LOAD_ERROR"; message: string }>
  | Readonly<{ type: "TOGGLE_MASK"; id: string }>
  | Readonly<{ type: "ADD_MASK"; mask: MaskRegion }>
  | Readonly<{ type: "REMOVE_MASK"; id: string }>
  | Readonly<{ type: "SET_ALL_ENABLED"; enabled: boolean }>
  | Readonly<{ type: "SET_EXPORT_SCALE"; scale: number }>
  | Readonly<{ type: "GENERATE_START" }>
  | Readonly<{ type: "GENERATE_DONE" }>
  | Readonly<{ type: "GENERATE_ERROR"; message: string }>
  | Readonly<{ type: "AI_DETECT_START" }>
  | Readonly<{
      type: "AI_DETECT_SUCCESS";
      masks: ReadonlyArray<MaskRegion>;
    }>
  | Readonly<{ type: "AI_DETECT_ERROR" }>
  | Readonly<{ type: "RESET" }>;

export const DEFAULT_EXPORT_SCALE = 2;

export const initialState: AppState = {
  status: "idle",
  fileName: null,
  pages: [],
  masks: [],
  exportScale: DEFAULT_EXPORT_SCALE,
  errorMessage: null,
  warnings: [],
  aiStatus: "idle",
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "LOAD_START":
      return {
        ...initialState,
        status: "loading",
        fileName: action.fileName,
        exportScale: state.exportScale,
      };
    case "LOAD_SUCCESS":
      return {
        ...state,
        status: "ready",
        pages: action.pages,
        masks: action.masks,
        warnings: action.warnings,
        errorMessage: null,
      };
    case "LOAD_ERROR":
      return { ...state, status: "error", errorMessage: action.message };
    case "TOGGLE_MASK":
      return {
        ...state,
        masks: state.masks.map((m) =>
          m.id === action.id ? { ...m, enabled: !m.enabled } : m,
        ),
      };
    case "ADD_MASK":
      return { ...state, masks: [...state.masks, action.mask] };
    case "REMOVE_MASK":
      return { ...state, masks: state.masks.filter((m) => m.id !== action.id) };
    case "SET_ALL_ENABLED":
      return {
        ...state,
        masks: state.masks.map((m) => ({ ...m, enabled: action.enabled })),
      };
    case "SET_EXPORT_SCALE":
      return { ...state, exportScale: action.scale };
    case "GENERATE_START":
      return { ...state, status: "generating", errorMessage: null };
    case "GENERATE_DONE":
      return { ...state, status: "ready" };
    case "GENERATE_ERROR":
      return { ...state, status: "ready", errorMessage: action.message };
    case "AI_DETECT_START":
      return { ...state, aiStatus: "detecting" };
    case "AI_DETECT_SUCCESS": {
      // AI 結果は既存マスクへ「追加」する(置換しない)。AI は email 等の
      // 確実なパターンでも確率的に取りこぼすことがあるため、ルールベースの
      // 検出結果とユーザーの ON/OFF 操作を保持し、同一ページで既存マスクと
      // 重ならない AI マスクのみを足す
      const fresh = action.masks.filter(
        (ai) =>
          !state.masks.some(
            (m) =>
              m.pageIndex === ai.pageIndex &&
              iou(m.rect, ai.rect) > DEDUPE_IOU_THRESHOLD,
          ),
      );
      return {
        ...state,
        aiStatus: "done",
        masks: [...state.masks, ...fresh],
      };
    }
    case "AI_DETECT_ERROR":
      // ルールベースの暫定マスクをそのまま維持する(サイレントフォールバック)
      return { ...state, aiStatus: "error" };
    case "RESET":
      return { ...initialState, exportScale: state.exportScale };
  }
};
