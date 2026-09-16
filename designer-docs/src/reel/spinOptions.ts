/** Spin timing — 1:1 with cat_mafia SPIN_OPTIONS (design-space). */

/** cat_mafia `REEL_SPEED` — design-px per ms. */
export const REEL_SPEED_PX_MS = 1.4
export const REEL_SETTLE_SPEED_PX_MS = REEL_SPEED_PX_MS
export const REEL_SPEED_LABEL = '1.4 px/ms'

/** cat_mafia reelPaddingMultiplierNormal */
export const REEL_PADDING_MULT = 0.7
/** cat_mafia reelSpinDelay — used for pre-spin launch stagger in the game.
 *  Reel Lab starts all columns together; stop order comes from padding distance. */
export const REEL_SPIN_DELAY_MS = 60

/**
 * cat_mafia reelLength = initialSymbols.length = visible rows + 2 padding.
 * Lab `board.rows` is visible rows only (BOARD_DIMENSIONS.y).
 */
export function reelLengthForBoard(rows: number): number {
  return rows + 2
}

/** Float base padding (cat_mafia accumulates floats, does not floor per reel). */
export function basePaddingSize(rows: number): number {
  return reelLengthForBoard(rows) * REEL_PADDING_MULT
}

/**
 * Accumulated paddingSize for reel `colIndex`, matching enhanceBoard reduce:
 * padding_i = (i + 1) * basePaddingSize.
 */
export function paddingSizeForColumn(rows: number, colIndex: number): number {
  return basePaddingSize(rows) * (colIndex + 1)
}

/**
 * Main+approach travel in symbol rows (cat_mafia topY → defaultY):
 * distance = symbolHeight * (reelLength + paddingSize).
 */
export function scrollRowsForColumn(rows: number, colIndex: number): number {
  return reelLengthForBoard(rows) + paddingSizeForColumn(rows, colIndex)
}
