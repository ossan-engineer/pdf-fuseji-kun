import { useRef, useState, type DragEvent } from "react";
import {
  ACCEPTED_FILE_TYPES,
  detectFileKind,
  type FileKind,
} from "../utils/fileKind";

type Props = Readonly<{
  onFile: (file: File, kind: FileKind) => void;
  loading: boolean;
  errorMessage: string | null;
}>;

export const DropZone = ({ onFile, loading, errorMessage }: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rejected, setRejected] = useState(false);

  const accept = (file: File | undefined) => {
    if (file === undefined) return;
    const kind = detectFileKind(file);
    if (kind === null) {
      setRejected(true);
      return;
    }
    setRejected(false);
    onFile(file, kind);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    accept(e.dataTransfer.files[0]);
  };

  return (
    <div
      className={`drop-zone${dragOver ? " drop-zone--over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        hidden
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {loading ? (
        <p className="drop-zone__main">読み込み中…</p>
      ) : (
        <>
          <p className="drop-zone__main">
            ここに履歴書・職務経歴書の PDF・画像をドロップ
          </p>
          <p className="drop-zone__sub">
            またはクリックしてファイルを選択(PDF / JPG / PNG / GIF)
          </p>
        </>
      )}
      {rejected && (
        <p className="drop-zone__error">PDF または画像ファイル(JPG / PNG / GIF)を選択してください</p>
      )}
      {errorMessage !== null && (
        <p className="drop-zone__error">{errorMessage}</p>
      )}
      <p className="drop-zone__note">
        処理はすべてお使いのブラウザ内で完結します。ファイルが外部に送信されることはありません。
      </p>
    </div>
  );
};
