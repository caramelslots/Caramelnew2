/**
 * Stage layout — 1:1 with cat_mafia MainContainer + boardLayout + desk slot.
 *
 * Pipeline:
 *   canvas → mainLayout (letterbox design space, maxScale 1.96)
 *         → board (offsets + BOARD_LAYOUT_SCALE / portrait formula)
 *         → desk slot (DESK_PARCHMENT around padded playfield)
 *
 * Source: apps/cat_mafia `stateLayout.ts`, `stateGame.boardLayout`, `constants.ts`.
 */

import {
  MAX_LAYOUT_SCALE,
  SYMBOL_SIZE,
  boardPixelSize,
  type BoardDimensions,
} from '../reel/constants'
import type { StageLayoutKind } from './deviceFit'

/** cat_mafia layoutType keys used for design space / board scale. */
export type GameLayoutType = 'desktop' | 'tablet' | 'landscape' | 'portrait'

/** cat_mafia `mainSizesMap` (stateLayout.ts). */
export const MAIN_SIZES: Record<GameLayoutType, { width: number; height: number }> = {
  desktop: { width: 1422, height: 800 },
  tablet: { width: 1000, height: 1000 },
  landscape: { width: 1600, height: 900 },
  portrait: { width: 800, height: 1422 },
}

/**
 * Fixed on-screen desk slot — cat_mafia DESK_PARCHMENT.
 * Playfield is this fraction of the desk chrome.
 */
export const DESK_PARCHMENT = {
  widthFrac: 0.8662,
  heightFrac: 0.6904,
  offsetXFrac: -0.0005,
  offsetYFrac: -0.0117,
} as const

/** ~2% inset so symbols sit inside the gold frame. */
export const DESK_PARCHMENT_PADDING = { width: 1.02, height: 1.02 } as const

/** Desk Spine content bounds (board slot in skeleton). */
export const BOARD_DESK_CONTENT = {
  width: 2050,
  height: 1993,
  centerX: 0,
  centerY: 28.5,
} as const

/** Vertical nudge for desk art only (game px, +y down). */
export const DESK_VISUAL_OFFSET_Y = -13.5

/**
 * Nudge the reel grid up inside the desk hole (board-local px, −Y = up).
 * Lab default sits a bit high in the parchment window for readability.
 */
export const PLAYFIELD_NUDGE_Y = -8

export const BOARD_FRAME_OFFSET = { x: 0, y: 0 } as const

/** cat_mafia BOARD_LAYOUT_OFFSETS. */
export const BOARD_LAYOUT_OFFSET = {
  desktop: { x: -20, y: -36 },
  tablet: { x: -16, y: -26 },
  landscape: { x: -12, y: -4 },
  portrait: { x: 0, y: -282 },
} as const

/** Extra board scale on top of mainLayout.scale (non-portrait). */
export const BOARD_LAYOUT_SCALE = {
  desktop: 1.22,
  tablet: 1.14,
  landscape: 1.16,
} as const

/** Portrait parchment target — cat_mafia PORTRAIT_* constants. */
export const PORTRAIT_BONUS_BAR_WIDTH_PX = 340
export const PORTRAIT_BOARD_WIDTH_TRIM_PX = 14
export const PORTRAIT_PHONE_BOARD_WIDTH_FRAC = 0.87

export const BG_VIEW_ZOOM = 0.95
export const BG_STILL_MATCH_SCALE = 1.012

/** Map Reel Lab device kind → cat_mafia layoutType. */
export function gameLayoutForKind(kind: StageLayoutKind): GameLayoutType {
  switch (kind) {
    case 'desktop':
      return 'desktop'
    case 'laptop':
      return 'tablet'
    case 'popout':
    case 'popoutS':
      return 'landscape'
    case 'portrait':
      return 'portrait'
  }
}

export type PortraitCanvasSizeType =
  | 'smallMobile'
  | 'mobile'
  | 'tablet'
  | 'largeTablet'
  | 'desktop'

export function portraitCanvasSizeType(deviceShortEdge: number): PortraitCanvasSizeType {
  if (deviceShortEdge <= 375) return 'smallMobile'
  if (deviceShortEdge <= 480) return 'mobile'
  if (deviceShortEdge <= 820) return 'tablet'
  if (deviceShortEdge <= 1024) return 'largeTablet'
  return 'desktop'
}

export function getPortraitPhoneScaleFactor(
  canvasSizeType: PortraitCanvasSizeType,
  deviceWidth: number,
): number {
  if (canvasSizeType !== 'smallMobile' && canvasSizeType !== 'mobile') return 1
  return (
    (deviceWidth * PORTRAIT_PHONE_BOARD_WIDTH_FRAC) /
    (PORTRAIT_BONUS_BAR_WIDTH_PX - PORTRAIT_BOARD_WIDTH_TRIM_PX)
  )
}

export function getPortraitParchmentSize(board: BoardDimensions) {
  const px = boardPixelSize(board)
  return {
    width: px.width * DESK_PARCHMENT_PADDING.width,
    height: px.height * DESK_PARCHMENT_PADDING.height,
  }
}

/** Uniform board.scale for portrait (applied inside MainContainer). */
export function getPortraitBoardScale(
  mainLayoutScale: number,
  canvasSizeType: PortraitCanvasSizeType,
  deviceWidth: number,
  board: BoardDimensions,
): number {
  const parchment = getPortraitParchmentSize(board)
  const targetWidthPx =
    (PORTRAIT_BONUS_BAR_WIDTH_PX - PORTRAIT_BOARD_WIDTH_TRIM_PX) *
    getPortraitPhoneScaleFactor(canvasSizeType, deviceWidth)
  return targetWidthPx / (parchment.width * mainLayoutScale)
}

export function deskSlotSizeForBoard(board: BoardDimensions) {
  const boardPx = boardPixelSize(board)
  return {
    width: (boardPx.width * DESK_PARCHMENT_PADDING.width) / DESK_PARCHMENT.widthFrac,
    height: (boardPx.height * DESK_PARCHMENT_PADDING.height) / DESK_PARCHMENT.heightFrac,
  }
}

/** @deprecated alias — slot size, not raw board/frac without padding. */
export function deskSizeForBoard(board: BoardDimensions) {
  return deskSlotSizeForBoard(board)
}

export type StageLayoutResult = {
  gameLayout: GameLayoutType
  main: {
    x: number
    y: number
    scale: number
    width: number
    height: number
  }
  board: {
    x: number
    y: number
    scale: number
    width: number
    height: number
    pivot: { x: number; y: number }
  }
  deskSlot: { width: number; height: number }
  /** Desk slot center in board-local (top-left origin) coords. */
  deskSlotCenter: { x: number; y: number }
  /** On-screen px per board design-px (main × board). */
  effectiveBoardScale: number
  /** Convenience: same as old `scale` for quality helpers. */
  scale: number
  centerX: number
  centerY: number
  kind: StageLayoutKind
}

/**
 * Full cat_mafia placement for the device canvas.
 */
export function layoutStageContent(
  canvas: { width: number; height: number },
  board: BoardDimensions,
  kind: StageLayoutKind = 'desktop',
): StageLayoutResult {
  const gameLayout = gameLayoutForKind(kind)
  const design = MAIN_SIZES[gameLayout]
  const rawScale = Math.min(canvas.width / design.width, canvas.height / design.height)
  const mainScale = Math.min(rawScale, MAX_LAYOUT_SCALE)

  const boardPx = boardPixelSize(board)
  const offset = BOARD_LAYOUT_OFFSET[gameLayout]

  const boardScale =
    gameLayout === 'portrait'
      ? getPortraitBoardScale(
          mainScale,
          portraitCanvasSizeType(Math.min(canvas.width, canvas.height)),
          Math.min(canvas.width, canvas.height),
          board,
        )
      : BOARD_LAYOUT_SCALE[gameLayout]

  const deskSlot = deskSlotSizeForBoard(board)
  const pivot = { x: boardPx.width / 2, y: boardPx.height / 2 }
  const frameX = pivot.x + BOARD_FRAME_OFFSET.x
  const frameY = pivot.y + BOARD_FRAME_OFFSET.y
  const deskSlotCenter = {
    x: frameX - DESK_PARCHMENT.offsetXFrac * deskSlot.width,
    y: frameY - DESK_PARCHMENT.offsetYFrac * deskSlot.height + DESK_VISUAL_OFFSET_Y,
  }

  const effectiveBoardScale = mainScale * boardScale
  // Screen position of board center (for debug / quality).
  const boardDesignX = design.width * 0.5 + offset.x
  const boardDesignY = design.height * 0.5 + offset.y
  const centerX = canvas.width * 0.5 + (boardDesignX - design.width * 0.5) * mainScale
  const centerY = canvas.height * 0.5 + (boardDesignY - design.height * 0.5) * mainScale

  return {
    gameLayout,
    main: {
      x: canvas.width * 0.5,
      y: canvas.height * 0.5,
      scale: mainScale,
      width: design.width,
      height: design.height,
    },
    board: {
      x: boardDesignX,
      y: boardDesignY,
      scale: boardScale,
      width: boardPx.width,
      height: boardPx.height,
      pivot,
    },
    deskSlot,
    deskSlotCenter,
    effectiveBoardScale,
    scale: effectiveBoardScale,
    centerX,
    centerY,
    kind,
  }
}

/**
 * cat_mafia street cover: fill canvas height; slight horizontal zoom-out.
 * Uses plate native size (not texture pixels) — same as getBackgroundPixiScale.
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

/** @deprecated use backgroundCoverScaleXY */
export function backgroundCoverScale(
  canvas: { width: number; height: number },
  texture: { width: number; height: number },
) {
  const { x, y } = backgroundCoverScaleXY(canvas, texture)
  return Math.max(x, y)
}

/** Glyph on-screen size helper (cell = SYMBOL_SIZE). */
export function glyphScreenPx(effectiveBoardScale: number, cellFill = 0.85) {
  return SYMBOL_SIZE * cellFill * effectiveBoardScale
}
