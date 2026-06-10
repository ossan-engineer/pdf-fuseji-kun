import type { Dispatch } from "react";
import type { AppAction } from "../state/appReducer";

type Props = Readonly<{
  fileName: string | null;
  enabledCount: number;
  generating: boolean;
  exportScale: number;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  dispatch: Dispatch<AppAction>;
  onDownload: () => void;
  onReset: () => void;
}>;

export const Toolbar = ({
  fileName,
  enabledCount,
  generating,
  exportScale,
  selectionMode,
  onToggleSelectionMode,
  dispatch,
  onDownload,
  onReset,
}: Props) => (
  <div className="toolbar">
    <span className="toolbar__file" title={fileName ?? undefined}>
      {fileName}
    </span>
    <span className="toolbar__count">黒塗り {enabledCount} 箇所</span>
    <div className="toolbar__actions">
      <button
        type="button"
        className={`toolbar__selection${selectionMode ? " toolbar__selection--on" : ""}`}
        aria-pressed={selectionMode}
        onClick={onToggleSelectionMode}
        title="タッチ端末で指ドラッグによる範囲選択を有効化します(OFF の間はスクロール優先)"
      >
        範囲選択 {selectionMode ? "ON" : "OFF"}
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: "SET_ALL_ENABLED", enabled: true })}
      >
        全て黒塗り
      </button>
      <button
        type="button"
        onClick={() => dispatch({ type: "SET_ALL_ENABLED", enabled: false })}
      >
        全て解除
      </button>
      <label className="toolbar__scale">
        画質
        <select
          value={exportScale}
          onChange={(e) =>
            dispatch({ type: "SET_EXPORT_SCALE", scale: Number(e.target.value) })
          }
        >
          <option value={2}>標準(144dpi)</option>
          <option value={3}>高画質(216dpi)</option>
        </select>
      </label>
      <button
        type="button"
        className="toolbar__download"
        onClick={onDownload}
        disabled={generating}
      >
        {generating ? "生成中…" : "マスク済みPDFをダウンロード"}
      </button>
      <button type="button" onClick={onReset}>
        別のPDFを開く
      </button>
    </div>
  </div>
);
