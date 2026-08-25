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
  desktop: { x: 0, y: -24 },
  laptop: { x: 0, y: -20 },
  popout: { x: 0, y: -14 },
  popoutS: { x: 0, y: -8 },
  portrait: { x: 0, y: -36 },
} as const

/** Fraction of canvas reserved for board assembly (rest = HUD / margins). */
const AVAIL = {
  desktop: { w: 0.94, h: 0.72, cy: 0.42 },
  laptop: { w: 0.94, h: 0.7, cy: 0.41 },
  popout: { w: 0.95, h: 0.66, cy: 0.4 },
  popoutS: { w: 0.96, h: 0.62, cy: 0.38 },
  portrait: { w: 0.94, h: 0.55, cy: 0.36 },
} as const

export const BG_VIEW_ZOOM = 0.95

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
    centerX: canvas.width * 0.5 + offset.x * scale * 0.15,
    centerY: canvas.height * avail.cy + offset.y * scale * 0.15,
    desk,
    board: boardPixelSize(board),
    kind,
  }
}

export function backgroundCoverScale(
  canvas: { width: number; height: number },
  texture: { width: number; height: number },
) {
  const cover = Math.max(canvas.width / texture.width, canvas.height / texture.height)
  return cover * BG_VIEW_ZOOM
}
