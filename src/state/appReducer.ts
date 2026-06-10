import type { AppState, MaskRegion, PageData } from "../types";

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
    case "RESET":
      return { ...initialState, exportScale: state.exportScale };
  }
};
