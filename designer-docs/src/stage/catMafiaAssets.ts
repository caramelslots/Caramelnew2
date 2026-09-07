/**
 * Default stage URLs / Spine packs served from cat_mafia static assets.
 * Vite mounts them at `/cat-mafia-assets/*` (see vite.config.ts).
 */

import type { StageBackgroundSpinePack } from './stagePack'
import type { ResolvedStageUrls } from './stagePack'

const ROOT = '/cat-mafia-assets'

/** Still street plate (loader / fallback). */
export const CAT_MAFIA_DAY_STILL = `${ROOT}/sprites/background/day.webp`

/** Board atlas region `board` — 2050×1993 content bounds (BOARD_DESK_CONTENT). */
export const CAT_MAFIA_BOARD_ATLAS = {
  pageUrl: `${ROOT}/spines/board/board.webp`,
  /** Spine atlas bounds: x, y, w, h (page top-left origin). */
  board: { x: 1873, y: 2, width: 2050, height: 1993 },
} as const

export function getCatMafiaStageUrls(): ResolvedStageUrls {
  return {
    background: CAT_MAFIA_DAY_STILL,
    // Desk base = board region; contour unused when using single board art.
    deskBase: CAT_MAFIA_BOARD_ATLAS.pageUrl,
    deskContour: CAT_MAFIA_BOARD_ATLAS.pageUrl,
  }
}

export function getCatMafiaBackgroundSpinePack(): StageBackgroundSpinePack {
  return {
    skeletonUrl: `${ROOT}/spines/background/skeleton.json`,
    atlasUrl: `${ROOT}/spines/background/skeleton.atlas`,
    pageUrls: {
      'skeleton.webp': `${ROOT}/spines/background/skeleton.webp`,
      'skeleton_2.webp': `${ROOT}/spines/background/skeleton_2.webp`,
      'skeleton_3.webp': `${ROOT}/spines/background/skeleton_3.webp`,
    },
    animationName: 'idle_final_delay2',
    label: 'cat_mafia street',
  }
}
