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
  // 描画用は state、イベントハンドラからの破棄・参照用は ref(render 中に ref は読まない)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);

  const replaceDoc = useCallback((next: PDFDocumentProxy | null) => {
    const prev = docRef.current;
    docRef.current = next;
    setDoc(next);
    prev?.loadingTask.destroy().catch(() => undefined);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      dispatch({ type: "LOAD_START", fileName: file.name });
      try {
        const loaded = await loadPdf(file);
        replaceDoc(loaded.doc);
        const masks = detectAll(loaded.pages);
        const hasText = loaded.pages.some((p) => p.texts.length > 0);
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
        dispatch({ type: "LOAD_SUCCESS", pages: loaded.pages, masks, warnings });
      } catch (e) {
        replaceDoc(null);
        dispatch({ type: "LOAD_ERROR", message: toErrorMessage(e) });
      }
    },
    [replaceDoc],
  );

  const handleDownload = useCallback(async () => {
    const currentDoc = docRef.current;
    if (currentDoc === null) return;
    dispatch({ type: "GENERATE_START" });
    try {
      const blob = await generateMaskedPdf(
        currentDoc,
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
    replaceDoc(null);
    dispatch({ type: "RESET" });
  }, [replaceDoc]);

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
                  key={page.pageIndex}
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
