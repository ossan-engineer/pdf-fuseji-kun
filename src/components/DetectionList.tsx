import type { Dispatch } from "react";
import type { AppAction } from "../state/appReducer";
import {
  CATEGORY_LABELS,
  type MaskRegion,
  type PiiCategory,
} from "../types";

type Props = Readonly<{
  masks: ReadonlyArray<MaskRegion>;
  dispatch: Dispatch<AppAction>;
}>;

const CATEGORY_ORDER: ReadonlyArray<PiiCategory> = [
  "name",
  "furigana",
  "address",
  "phone",
  "email",
  "postalCode",
  "birthdate",
  "manual",
];

export const DetectionList = ({ masks, dispatch }: Props) => {
  if (masks.length === 0) {
    return (
      <div className="detection-list">
        <h2>検出結果</h2>
        <p className="detection-list__empty">
          自動検出された項目はありません。プレビュー上をドラッグして手動でマスクを追加できます。
        </p>
      </div>
    );
  }
  return (
    <div className="detection-list">
      <h2>検出結果</h2>
      {CATEGORY_ORDER.map((category) => {
        const items = masks.filter((m) => m.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category} className="detection-list__group">
            <h3>{CATEGORY_LABELS[category]}</h3>
            <ul>
              {items.map((mask) => (
                <li key={mask.id} className="detection-list__item">
                  <label>
                    <input
                      type="checkbox"
                      checked={mask.enabled}
                      onChange={() =>
                        dispatch({ type: "TOGGLE_MASK", id: mask.id })
                      }
                    />
                    <span className="detection-list__text">
                      {mask.matchedText !== null && mask.matchedText !== ""
                        ? mask.matchedText
                        : "(選択領域)"}
                    </span>
                    <span className="detection-list__page">
                      p.{mask.pageIndex + 1}
                    </span>
                  </label>
                  {mask.source === "manual" && (
                    <button
                      type="button"
                      className="detection-list__remove"
                      onClick={() =>
                        dispatch({ type: "REMOVE_MASK", id: mask.id })
                      }
                      aria-label="このマスクを削除"
                    >
                      削除
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
