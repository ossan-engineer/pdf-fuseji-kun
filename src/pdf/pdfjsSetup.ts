// Safari(iOS 含む)はモダンビルドの対応表に含まれないため legacy ビルドを使う。
// 参照: https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions
import { GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

// 本体と worker は同一バージョン・同一ビルド必須。?url import なら自動で一致する
GlobalWorkerOptions.workerSrc = workerUrl;
