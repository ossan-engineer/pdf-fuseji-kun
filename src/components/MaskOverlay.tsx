import { useRef, useState, type Dispatch, type PointerEvent } from "react";
import type { AppAction } from "../state/appReducer";
import { CATEGORY_LABELS, type MaskRegion, type PageData } from "../types";
import { rectFromPoints } from "../utils/geometry";

type Props = Readonly<{
  page: PageData;
  masks: ReadonlyArray<MaskRegion>;
  dispatch: Dispatch<AppAction>;
}>;

type Draft = Readonly<{
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}>;

// これ未満のドラッグは誤操作とみなして無視(pt)
const MIN_DRAG_SIZE = 6;

export const MaskOverlay = ({ page, masks, dispatch }: Props) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const toPageCoords = (e: PointerEvent): readonly [number, number] => {
    const svg = svgRef.current;
    if (svg === null) return [0, 0];
    const bounds = svg.getBoundingClientRect();
    const scale = page.width / bounds.width;
    return [
      (e.clientX - bounds.left) * scale,
      (e.clientY - bounds.top) * scale,
    ];
  };

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    // 既存マスク上はクリックトグルに譲る(ドラッグ開始は背景のみ)
    if (e.target !== e.currentTarget) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = toPageCoords(e);
    setDraft({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (draft === null) return;
    const [x, y] = toPageCoords(e);
    setDraft({ ...draft, currentX: x, currentY: y });
  };

  const handlePointerUp = () => {
    if (draft === null) return;
    const rect = rectFromPoints(
      draft.startX,
      draft.startY,
      draft.currentX,
      draft.currentY,
    );
    if (rect.width >= MIN_DRAG_SIZE && rect.height >= MIN_DRAG_SIZE) {
      dispatch({
        type: "ADD_MASK",
        mask: {
          id: crypto.randomUUID(),
          pageIndex: page.pageIndex,
          rect,
          category: "manual",
          source: "manual",
          enabled: true,
          matchedText: null,
        },
      });
    }
    setDraft(null);
  };

  const draftRect =
    draft === null
      ? null
      : rectFromPoints(draft.startX, draft.startY, draft.currentX, draft.currentY);

  return (
    <svg
      ref={svgRef}
      className="mask-overlay"
      viewBox={`0 0 ${page.width} ${page.height}`}
      preserveAspectRatio="none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDraft(null)}
    >
      {masks.map((mask) => (
        <rect
          key={mask.id}
          className={
            mask.enabled ? "mask-rect" : "mask-rect mask-rect--disabled"
          }
          x={mask.rect.x}
          y={mask.rect.y}
          width={mask.rect.width}
          height={mask.rect.height}
          onClick={() => dispatch({ type: "TOGGLE_MASK", id: mask.id })}
        >
          <title>
            {`${CATEGORY_LABELS[mask.category]}${
              mask.matchedText !== null ? `: ${mask.matchedText}` : ""
            }(クリックで${mask.enabled ? "解除" : "有効化"})`}
          </title>
        </rect>
      ))}
      {draftRect !== null && (
        <rect
          className="mask-rect--draft"
          x={draftRect.x}
          y={draftRect.y}
          width={draftRect.width}
          height={draftRect.height}
        />
      )}
    </svg>
  );
};
