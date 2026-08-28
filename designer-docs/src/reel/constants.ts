/** Board / reel constants mirrored from cat_mafia for Reel Lab. */

export const SYMBOL_SIZE = 100
export const SYMBOL_TEXTURE_NATIVE_PX = 196
export const CELL_SYMBOL_SIZE = 0.85

/** Caps MainContainer upscale so 196² static isn't blown past native density. */
export const MAX_LAYOUT_SCALE = SYMBOL_TEXTURE_NATIVE_PX / SYMBOL_SIZE

/** Half-cell inset — reel centers at 50, 150, … (cat_mafia REEL_PADDING). */
export const REEL_PADDING = 0.5

/**
 * Extra X (game-space px) for rightmost reels — under gold rails.
 * Indices 3–4 = last two of five columns.
 */
export const REEL_SYMBOL_X_NUDGE_PX: Readonly<Record<number, number>> = {
  3: 2,
  4: 4,
}

/** Soft top fade length (px) — cat_mafia BOARD_MASK_FEATHER. */
export const BOARD_MASK_FEATHER = 20
/** Hard bottom clip — no soft fade at bottom runway. */
export const BOARD_MASK_BOTTOM_FEATHER = 0
export const BOARD_MASK_OVERFLOW = { top: 24, bottom: 11 } as const
export const BOARD_MASK_SPIN_OVERFLOW = { top: 24, bottom: 11 } as const

export const MIN_BOARD_COLS = 3
export const MIN_BOARD_ROWS = 3
export const DEFAULT_BOARD_COLS = 5
export const DEFAULT_BOARD_ROWS = 5

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

/** Symbol X in board-local px — cat_mafia getSymbolX. */
export function getSymbolX(reelIndex: number): number {
  return SYMBOL_SIZE * (reelIndex + REEL_PADDING) + (REEL_SYMBOL_X_NUDGE_PX[reelIndex] ?? 0)
}

/** Symbol Y in board-local px — cat_mafia getSymbolY. */
export function getSymbolY(rowIndex: number): number {
  return (rowIndex + REEL_PADDING) * SYMBOL_SIZE
}

export function clampBoardDim(value: number, min: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.floor(value))
}
