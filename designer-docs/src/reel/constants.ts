/** Board / reel constants mirrored from cat_mafia for Reel Lab. */

export const SYMBOL_SIZE = 100
export const SYMBOL_TEXTURE_NATIVE_PX = 196
export const CELL_SYMBOL_SIZE = 0.85

export const MIN_BOARD_COLS = 3
export const MIN_BOARD_ROWS = 3
export const DEFAULT_BOARD_COLS = 5
export const DEFAULT_BOARD_ROWS = 4

export type BoardDimensions = {
  cols: number
  rows: number
}

export function boardPixelSize(dims: BoardDimensions) {
  return {
    width: SYMBOL_SIZE * dims.cols,
    height: SYMBOL_SIZE * dims.rows,
  }
}

export function clampBoardDim(value: number, min: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.floor(value))
}
