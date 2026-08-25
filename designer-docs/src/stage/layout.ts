import { boardPixelSize, type BoardDimensions } from '../reel/constants'
import type { StageLayoutKind } from './deviceFit'

/**
 * Desk hole as a fraction of the desk sprite.
 * Lab defaults use a tight frame around the board (not cat_mafia parchment oversize),
 * so symbols visually fill the dark window.
 */
export const DESK_PARCHMENT = {
  widthFrac: 1 / 1.12,
  heightFrac: 1 / 1.18,
  offsetXFrac: 0,
  offsetYFrac: 0,
} as const

export const DESK_PARCHMENT_PADDING = { width: 1, height: 1 } as const

export const BOARD_LAYOUT_SCALE = {
  /** Match cat_mafia BOARD_LAYOUT_SCALE (desktop/tablet/landscape). */
  desktop: 1.22,
  laptop: 1.14,
  popout: 1.16,
  popoutS: 1.1,
  portrait: 1.05,
} as const

export const BOARD_LAYOUT_OFFSET = {
  /** Match cat_mafia BOARD_LAYOUT_OFFSETS (desktop / tablet / landscape / portrait). */
  desktop: { x: -20, y: -36 },
  laptop: { x: -16, y: -26 },
  popout: { x: -12, y: -4 },
  popoutS: { x: -8, y: -2 },
  portrait: { x: 0, y: -60 },
} as const

/** Fraction of canvas reserved for board assembly (rest = HUD / margins).
 *  cy ≈ cat_mafia desktop: board sits in upper play area, HUD over street below. */
const AVAIL = {
  desktop: { w: 0.94, h: 0.68, cy: 0.4 },
  laptop: { w: 0.94, h: 0.66, cy: 0.39 },
  popout: { w: 0.95, h: 0.62, cy: 0.38 },
  popoutS: { w: 0.96, h: 0.58, cy: 0.36 },
  portrait: { w: 0.94, h: 0.52, cy: 0.34 },
} as const

export const BG_VIEW_ZOOM = 0.95
/** Nudge to match cat_mafia still-vs-spine cover (`BG_STILL_MATCH_SCALE`). */
export const BG_STILL_MATCH_SCALE = 1.012

export function deskSizeForBoard(board: BoardDimensions) {
  const boardPx = boardPixelSize(board)
  return {
    width: boardPx.width / DESK_PARCHMENT.widthFrac,
    height: boardPx.height / DESK_PARCHMENT.heightFrac,
  }
}

/**
 * Fit desk+board assembly into the device canvas for the active layout kind.
 */
export function layoutStageContent(
  canvas: { width: number; height: number },
  board: BoardDimensions,
  kind: StageLayoutKind = 'desktop',
) {
  const desk = deskSizeForBoard(board)
  const avail = AVAIL[kind]
  const offset = BOARD_LAYOUT_OFFSET[kind]
  const layoutScale = BOARD_LAYOUT_SCALE[kind]

  const availW = canvas.width * avail.w
  const availH = canvas.height * avail.h
  const base = Math.min(availW / desk.width, availH / desk.height)
  // Prefer cat_mafia-like board scale; never exceed fit-into-canvas.
  const scale = Math.min(base, layoutScale)

  return {
    scale,
    // Same idea as cat_mafia boardLayout: canvas center + layout offset (game px).
    centerX: canvas.width * 0.5 + offset.x * scale,
    centerY: canvas.height * avail.cy + offset.y * scale,
    desk,
    board: boardPixelSize(board),
    kind,
  }
}

/**
 * cat_mafia street cover: fill canvas height; slight horizontal zoom-out
 * (`BG_VIEW_ZOOM`) so more of the scene fits — not uniform letterbox.
 */
export function backgroundCoverScaleXY(
  canvas: { width: number; height: number },
  texture: { width: number; height: number },
): { x: number; y: number } {
  const tw = Math.max(texture.width, 1)
  const th = Math.max(texture.height, 1)
  const cover = Math.max(canvas.width / tw, canvas.height / th)
  return {
    x: cover * BG_VIEW_ZOOM * BG_STILL_MATCH_SCALE,
    y: (canvas.height / th) * BG_STILL_MATCH_SCALE,
  }
}

/** @deprecated use backgroundCoverScaleXY — kept for quality helpers if any. */
export function backgroundCoverScale(
  canvas: { width: number; height: number },
  texture: { width: number; height: number },
) {
  const { x, y } = backgroundCoverScaleXY(canvas, texture)
  return Math.max(x, y)
}
