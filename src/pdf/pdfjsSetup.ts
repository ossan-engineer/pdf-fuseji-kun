// Safari(iOS 含む)はモダンビルドの対応表に含まれないため legacy ビルドを使う。
// 参照: https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

// Safari は ReadableStream の非同期イテレーション(for await...of)に未対応
// (MDN browser-compat-data: api.ReadableStream.@@asyncIterator は safari: "preview" のみ)。
// pdf.js v6 の getTextContent(pdf.mjs 内の `for await (const value of readableStream)`)が
// これを使い TypeError になるため、未対応環境にだけポリフィルを当てる。
// worker 側の同等箇所は pdf.js 内部で try/catch されており同期デコードへフォールバックする。
const polyfillReadableStreamAsyncIterator = (): void => {
  const proto = ReadableStream.prototype as ReadableStream<unknown> & {
    [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
  };
  if (typeof proto[Symbol.asyncIterator] === "function") return;
  const iterate = async function* (this: ReadableStream<unknown>) {
    const reader = this.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  };
  // lib.dom が宣言する厳密なシグネチャ(ReadableStreamAsyncIterator)とは
  // 構造互換だが nominal には合わないためキャストする
  proto[Symbol.asyncIterator] =
    iterate as unknown as (typeof proto)[typeof Symbol.asyncIterator];
};

polyfillReadableStreamAsyncIterator();

// 本体と worker は同一バージョン・同一ビルド必須。?url import なら自動で一致する
GlobalWorkerOptions.workerSrc = workerUrl;
