import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
} from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPageToCanvas } from "../pdf/renderPage";
import type { AppAction } from "../state/appReducer";
import type { MaskRegion, PageData } from "../types";
import { MaskOverlay } from "./MaskOverlay";

type Props = Readonly<{
  doc: PDFDocumentProxy;
  page: PageData;
  masks: ReadonlyArray<MaskRegion>;
  dispatch: Dispatch<AppAction>;
}>;

const MAX_DPR = 3;

export const PageView = ({ doc, page, masks, dispatch }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [displayWidth, setDisplayWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el === null) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      // リサイズのたびの再レンダリングを抑えるため整数 px に丸める
      setDisplayWidth(Math.round(width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || displayWidth === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const scale = (displayWidth / page.width) * dpr;
    const taskPromise = doc.getPage(page.pageIndex + 1).then((pdfPage) => {
      const task = renderPageToCanvas(pdfPage, canvas, scale);
      // アンマウント・再レンダリングによる cancel 例外は握りつぶす
      task.promise.catch(() => undefined);
      return task;
    });
    return () => {
      taskPromise.then((task) => task.cancel()).catch(() => undefined);
    };
  }, [doc, page, displayWidth]);

  return (
    <div
      ref={containerRef}
      className="page-view"
      style={{ aspectRatio: `${page.width} / ${page.height}` }}
    >
      <canvas ref={canvasRef} className="page-view__canvas" />
      <MaskOverlay page={page} masks={masks} dispatch={dispatch} />
    </div>
  );
};
