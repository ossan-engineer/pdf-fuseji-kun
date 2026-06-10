import { GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// 本体と worker は同一バージョン必須。?url import ならバンドル時に自動で一致する
GlobalWorkerOptions.workerSrc = workerUrl;
