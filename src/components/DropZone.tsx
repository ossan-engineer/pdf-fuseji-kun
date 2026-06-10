import { useRef, useState, type DragEvent } from "react";

type Props = Readonly<{
  onFile: (file: File) => void;
  loading: boolean;
  errorMessage: string | null;
}>;

const isPdf = (file: File): boolean =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

export const DropZone = ({ onFile, loading, errorMessage }: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rejected, setRejected] = useState(false);

  const accept = (file: File | undefined) => {
    if (file === undefined) return;
    if (!isPdf(file)) {
      setRejected(true);
      return;
    }
    setRejected(false);
    onFile(file);
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
        accept="application/pdf,.pdf"
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
            ここに履歴書・職務経歴書の PDF をドロップ
          </p>
          <p className="drop-zone__sub">またはクリックしてファイルを選択</p>
        </>
      )}
      {rejected && (
        <p className="drop-zone__error">PDF ファイルを選択してください</p>
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
