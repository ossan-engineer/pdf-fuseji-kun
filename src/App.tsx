import { useCallback, useReducer, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { DetectionList } from "./components/DetectionList";
import { DropZone } from "./components/DropZone";
import { PageView } from "./components/PageView";
import { Toolbar } from "./components/Toolbar";
import { detectAll } from "./detect/detect";
import { generateMaskedPdf } from "./pdf/generateMaskedPdf";
import { loadPdf } from "./pdf/loadPdf";
import { appReducer, initialState } from "./state/appReducer";
import { downloadBlob } from "./utils/download";

const toErrorMessage = (e: unknown): string => {
  if (e instanceof Error && e.name === "PasswordException") {
    return "パスワード保護された PDF は開けません。保護を解除してから読み込んでください。";
  }
  if (e instanceof Error && e.name === "InvalidPDFException") {
    return "PDF として読み込めないファイルです。";
  }
  return "PDF の処理中にエラーが発生しました。";
};

export const App = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  // docRef と描画の同期を取るためのバージョン値(RESET / 再読込で更新)
  const [docVersion, setDocVersion] = useState(0);

  const handleFile = useCallback(async (file: File) => {
    dispatch({ type: "LOAD_START", fileName: file.name });
    try {
      await docRef.current?.destroy();
      docRef.current = null;
      const { doc, pages } = await loadPdf(file);
      docRef.current = doc;
      setDocVersion((v) => v + 1);
      const masks = detectAll(pages);
      const hasText = pages.some((p) => p.texts.length > 0);
      const warnings = [
        ...(hasText
          ? []
          : [
              "テキストを抽出できませんでした(スキャン画像の PDF の可能性があります)。自動検出は使えないため、プレビューをドラッグして手動でマスクしてください。",
            ]),
        ...(hasText && masks.length === 0
          ? [
              "個人情報を自動検出できませんでした。プレビューをドラッグして手動でマスクを追加してください。",
            ]
          : []),
      ];
      dispatch({ type: "LOAD_SUCCESS", pages, masks, warnings });
    } catch (e) {
      dispatch({ type: "LOAD_ERROR", message: toErrorMessage(e) });
    }
  }, []);

  const handleDownload = useCallback(async () => {
    const doc = docRef.current;
    if (doc === null) return;
    dispatch({ type: "GENERATE_START" });
    try {
      const blob = await generateMaskedPdf(
        doc,
        state.pages,
        state.masks,
        state.exportScale,
      );
      downloadBlob(blob, `伏せ字済み_${state.fileName ?? "document.pdf"}`);
      dispatch({ type: "GENERATE_DONE" });
    } catch {
      dispatch({
        type: "GENERATE_ERROR",
        message:
          "PDF の生成に失敗しました。画質を「標準」にして再試行してください。",
      });
    }
  }, [state.pages, state.masks, state.exportScale, state.fileName]);

  const handleReset = useCallback(() => {
    docRef.current?.destroy().catch(() => undefined);
    docRef.current = null;
    setDocVersion((v) => v + 1);
    dispatch({ type: "RESET" });
  }, []);

  const doc = docRef.current;
  const showWorkspace =
    doc !== null && (state.status === "ready" || state.status === "generating");

  return (
    <div className="app">
      <header className="app__header">
        <h1>PDF伏せ字くん</h1>
        <p>
          履歴書・職務経歴書の個人情報を検出して黒塗りした PDF
          を作成します。処理はすべてブラウザ内で完結し、ファイルが外部に送信されることはありません。
        </p>
      </header>
      {!showWorkspace ? (
        <DropZone
          onFile={handleFile}
          loading={state.status === "loading"}
          errorMessage={state.status === "error" ? state.errorMessage : null}
        />
      ) : (
        <>
          <Toolbar
            fileName={state.fileName}
            enabledCount={state.masks.filter((m) => m.enabled).length}
            generating={state.status === "generating"}
            exportScale={state.exportScale}
            dispatch={dispatch}
            onDownload={handleDownload}
            onReset={handleReset}
          />
          {state.warnings.map((warning) => (
            <p key={warning} className="app__warning">
              {warning}
            </p>
          ))}
          {state.errorMessage !== null && (
            <p className="app__error">{state.errorMessage}</p>
          )}
          <p className="app__hint">
            黒塗り箇所のクリックで有効/解除を切り替え、空白部分のドラッグで任意の領域(顔写真など)をマスクできます。
          </p>
          <div className="app__workspace">
            <main className="app__pages">
              {state.pages.map((page) => (
                <PageView
                  key={`${docVersion}-${page.pageIndex}`}
                  doc={doc}
                  page={page}
                  masks={state.masks.filter(
                    (m) => m.pageIndex === page.pageIndex,
                  )}
                  dispatch={dispatch}
                />
              ))}
            </main>
            <aside className="app__sidebar">
              <DetectionList masks={state.masks} dispatch={dispatch} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
