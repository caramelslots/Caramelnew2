/**
 * On-cell size ratios mirrored from cat_mafia `SYMBOL_INFO_MAP`.
 *
 * Spin WebPs use CELL_SYMBOL_SIZE directly (glyph already fills 196²).
 * Idle/land/win spines use inflated ratios (skeleton ≫ art) so the
 * silhouette lands near the same 0.85 × 100px cell fill.
 *
 * SpineProvider scales with `height / skeletonData.height` —
 * Reel Lab must use the same formula (not getLocalBounds fit).
 */

import { CELL_SYMBOL_SIZE } from './constants'

/** Letter skeletons (~2603) with ~1306 glyph art. */
const LETTER_SKELETON_HEIGHT = 2603.14
const LETTER_ART_HEIGHT = 1306
export const LETTER_SYMBOL_SIZE =
  (CELL_SYMBOL_SIZE * LETTER_SKELETON_HEIGHT) / LETTER_ART_HEIGHT

const TELEPHONE_SKELETON_HEIGHT = 2603.14
const TELEPHONE_ART_SPAN = 1286
export const TELEPHONE_SYMBOL_SIZE =
  (CELL_SYMBOL_SIZE * TELEPHONE_SKELETON_HEIGHT) / TELEPHONE_ART_SPAN

const LIGHTER_SKELETON_HEIGHT = 2104.8
const LIGHTER_ART_SPAN = 1000
export const LIGHTER_SYMBOL_SIZE =
  (CELL_SYMBOL_SIZE * LIGHTER_SKELETON_HEIGHT) / LIGHTER_ART_SPAN
export const LIGHTER_OFFSET_Y = -6

const DIAMOND_SKELETON_HEIGHT = 1915.07
const DIAMOND_ART_SPAN = 1504
export const DIAMOND_SYMBOL_SIZE =
  (CELL_SYMBOL_SIZE * DIAMOND_SKELETON_HEIGHT) / DIAMOND_ART_SPAN

const REVOLVER_SKELETON_HEIGHT = 2050.44
const REVOLVER_ART_SPAN = 1267
export const REVOLVER_SYMBOL_SIZE =
  (CELL_SYMBOL_SIZE * REVOLVER_SKELETON_HEIGHT) / REVOLVER_ART_SPAN

const CARTRIDGE_SKELETON_HEIGHT = 3157.2
const CARTRIDGE_ART_SPAN = 1450
export const CARTRIDGE_SYMBOL_SIZE =
  (CELL_SYMBOL_SIZE * CARTRIDGE_SKELETON_HEIGHT) / CARTRIDGE_ART_SPAN

/** Default for unknown uploads — letter inflation (most common designer pack). */
export const DEFAULT_SPINE_SIZE_RATIO = LETTER_SYMBOL_SIZE

export type SymbolSizeFit = {
  /** Passed as SpineProvider `height / SYMBOL_SIZE`. */
  sizeRatio: number
  offsetY: number
}

/**
 * Resolve cat_mafia-compatible size ratios from a symbol label / folder name.
 */
export function resolveSymbolSizeFit(label: string): SymbolSizeFit {
  const key = label
    .replace(/\.(json|skel)$/i, '')
    .trim()
    .toUpperCase()

  if (
    key === 'H1' ||
    key === 'DIAMOND' ||
    key.includes('DIAMOND') ||
    key.includes('DIA')
  ) {
    return { sizeRatio: DIAMOND_SYMBOL_SIZE, offsetY: 0 }
  }
  if (key === 'H2' || key.includes('REVOLVER') || key.includes('GUN')) {
    return { sizeRatio: REVOLVER_SYMBOL_SIZE, offsetY: 0 }
  }
  if (key === 'H3' || key.includes('LIGHTER')) {
    return { sizeRatio: LIGHTER_SYMBOL_SIZE, offsetY: LIGHTER_OFFSET_Y }
  }
  if (key === 'H4' || key.includes('TELEPHONE') || key.includes('PHONE')) {
    return { sizeRatio: TELEPHONE_SYMBOL_SIZE, offsetY: 0 }
  }
  if (key === 'BT' || key.includes('CARTRIDGE') || key.includes('BULLET')) {
    return { sizeRatio: CARTRIDGE_SYMBOL_SIZE, offsetY: 0 }
  }
  if (
    key === 'L1' ||
    key === 'L2' ||
    key === 'L3' ||
    key === 'L4' ||
    key === 'A' ||
    key === 'J' ||
    key === 'K' ||
    key === 'Q' ||
    key === 'LETTERS' ||
    key.startsWith('LETTER')
  ) {
    return { sizeRatio: LETTER_SYMBOL_SIZE, offsetY: 0 }
  }

  return { sizeRatio: DEFAULT_SPINE_SIZE_RATIO, offsetY: 0 }
}
