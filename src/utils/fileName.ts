const pad2 = (n: number): string => String(n).padStart(2, "0");

// 出力ファイル名には元のファイル名を含めない(履歴書は氏名入りのファイル名が多く、
// 黒塗りしても名前がファイル名から漏れるため)。ローカル時刻の日時で一意にする
export const maskedFileName = (date: Date): string => {
  const ymd = `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
  const hms = `${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
  return `masked_${ymd}-${hms}.pdf`;
};
