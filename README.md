# PDF伏せ字くん

履歴書・職務経歴書の PDF から個人情報を検出して黒塗りした PDF を作成する Web サービスです。

**処理はすべてブラウザ内で完結します。** ファイルがサーバーに送信・保存されることは一切ありません(静的サイトとしてホスティング可能)。

## 機能

- **自動検出**: 氏名・ふりがな(ラベル近傍ヒューリスティック)、住所・電話番号・メールアドレス・郵便番号・生年月日(正規表現)
- **手動補正**: プレビュー上の黒塗りをクリックで有効/解除、空白部分をドラッグして任意領域(顔写真など)を追加マスク
- **真の墨消し**: 各ページを黒塗り済みのラスタ画像として PDF を再生成するため、マスク下のテキストデータは出力 PDF に残りません(オーバーレイ型の「見た目だけ黒塗り」ではありません)
- 画質選択: 標準(144dpi)/ 高画質(216dpi)

## 制限事項

- 入力は PDF のみ(スキャン画像 PDF はテキストが無いため自動検出不可。手動マスクは可能)
- パスワード保護された PDF は開けません
- 出力 PDF は画像化されるため、テキスト検索・コピーはできなくなります(仕様)
- 縦書きテキストは自動検出対象外(手動マスクで対応)

## 開発

要件: Node.js >= 22.13(pdfjs-dist 6.x の要求)、pnpm

```sh
pnpm install
pnpm dev        # 開発サーバー
pnpm test       # ユニットテスト+統合テスト(Vitest)
pnpm lint       # ESLint
pnpm build      # 型チェック + 本番ビルド(dist/ に静的成果物)
```

## 技術スタック

- React 19 + Vite + TypeScript
- [pdfjs-dist](https://github.com/mozilla/pdf.js)(Mozilla)— PDF レンダリング・テキスト座標抽出
- [jspdf](https://github.com/parallax/jsPDF)(parallax)— 画像化 PDF の生成

## アーキテクチャ

```
src/
├── detect/   # 個人情報検出(純粋関数のみ・DOM/pdf.js 非依存・テスト対象)
├── pdf/      # pdf.js / jsPDF との境界(読み込み・描画・生成)
├── state/    # useReducer 用の純粋 reducer
├── components/  # DropZone / PageView / MaskOverlay / Toolbar / DetectionList
└── utils/    # 矩形演算・ダウンロード
```

座標系は全レイヤで「scale=1 の pdf.js viewport 座標(左上原点・pt)」に統一しています。
