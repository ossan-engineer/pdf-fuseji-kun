import type { PageData, PositionedText } from "../types";

export const CHAR_WIDTH = 10;
export const LINE_HEIGHT = 10;

// テスト用: 1 文字 10pt 幅のテキストアイテムを作る
export const makeItem = (
  str: string,
  x: number,
  y: number,
  overrides: Partial<PositionedText> = {},
): PositionedText => ({
  str,
  rect: {
    x,
    y,
    width: Array.from(str).length * CHAR_WIDTH,
    height: LINE_HEIGHT,
  },
  hasEOL: false,
  dir: "ltr",
  ...overrides,
});

export const makePage = (
  texts: ReadonlyArray<PositionedText>,
  width = 600,
  height = 850,
): PageData => ({ pageIndex: 0, width, height, texts });
