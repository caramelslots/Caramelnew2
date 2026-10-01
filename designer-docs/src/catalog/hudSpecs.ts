/** HUD handoff specs — util icons (spin documented separately). */

import { HUD_SPIN_ON_SCREEN } from './spinSpecs'

export {
  GUIDE_SPIN_FIT_OPTIONS,
  GUIDE_SPIN_SOURCE,
  GUIDE_SPIN_STATIC_AUTOPLAY_URL,
  GUIDE_SPIN_STATIC_NORMAL_URL,
  HUD_SPIN_ART_PX,
  HUD_SPIN_AUTOPLAY_PEAK,
  HUD_SPIN_AUTOPLAY_STATIC_PX,
  HUD_SPIN_MIN_TEXTURE_2X,
  HUD_SPIN_ON_SCREEN,
  HUD_SPIN_ON_SCREEN_DESKTOP,
  HUD_SPIN_ON_SCREEN_PORTRAIT,
  HUD_SPIN_PEAK,
  HUD_SPIN_PX,
  SPIN_FOLDER_ROWS,
  SPIN_PRESS_CLIP,
  SPIN_SKELETON_BOUNDS,
  SPIN_TEXTURE_FORMAT,
} from './spinSpecs'

export const HUD_TEXTURE_FORMAT = 'webp' as const

const HUD_ASSET_ROOT = '/cat-mafia-assets/sprites/ui'

/** Util icons — turbo, info, menu, bet ±, autoplay mobile. */
export const HUD_SQUARE_ICON_PX = 184
/** Optional 2× export; on HUD layout still maps to ~184 logical. */
export const HUD_SQUARE_ICON_PX_2X = 368
export const HUD_SQUARE_ICON_PEAK = `${HUD_SQUARE_ICON_PX}×${HUD_SQUARE_ICON_PX} или ${HUD_SQUARE_ICON_PX_2X}×${HUD_SQUARE_ICON_PX_2X}`

export type HudSpecRow = {
  id: string
  label: string
  peak: string
  folder: string
  files: string
  onScreen: string
  notes?: string
}

/** Docs table — HUD elements. */
export const HUD_SPEC_ROWS: HudSpecRow[] = [
  {
    id: 'turbo',
    label: 'Turbo',
    peak: HUD_SQUARE_ICON_PEAK,
    folder: 'ui/turbo/',
    files: 'turbo_1.webp, turbo_2.webp, turbo_3.webp',
    onScreen: '≈76–108 CSS px',
  },
  {
    id: 'autoplay-mobile',
    label: 'Autoplay (mobile)',
    peak: HUD_SQUARE_ICON_PEAK,
    folder: 'ui/autoplay/',
    files: 'autoplay_mobile.webp',
    onScreen: '≈76–108 CSS px',
  },
  {
    id: 'bet-plus',
    label: 'Bet +',
    peak: HUD_SQUARE_ICON_PEAK,
    folder: 'ui/bet/',
    files: 'plus.webp',
    onScreen: '≈76–108 CSS px',
  },
  {
    id: 'bet-minus',
    label: 'Bet −',
    peak: HUD_SQUARE_ICON_PEAK,
    folder: 'ui/bet/',
    files: 'minus.webp',
    onScreen: '≈76–108 CSS px',
  },
  {
    id: 'spin',
    label: 'Spin',
    peak: HUD_SQUARE_ICON_PEAK,
    folder: 'designer_assets/spin/',
    files: 'spin_button.*, spin_1.webp, spin_2.webp',
    onScreen: HUD_SPIN_ON_SCREEN,
  },
  {
    id: 'menu',
    label: 'Menu',
    peak: HUD_SQUARE_ICON_PEAK,
    folder: 'ui/settings/',
    files: 'menu.webp',
    onScreen: '≈76–108 CSS px',
  },
  {
    id: 'info',
    label: 'Info',
    peak: HUD_SQUARE_ICON_PEAK,
    folder: 'ui/info/',
    files: 'info.webp',
    onScreen: '≈76–108 CSS px',
  },
]

export type HudGuideExampleKind = 'square'

export type HudGuideExample = {
  id: string
  title: string
  file: string
  url: string
  peakLabel: string
  kind: HudGuideExampleKind
  displayPx: number
}

/** Square util icons — spin preview is separate (Spine + 2 static). */
export const HUD_GUIDE_EXAMPLES: HudGuideExample[] = [
  {
    id: 'turbo',
    title: 'Turbo',
    file: 'turbo_1.webp',
    url: `${HUD_ASSET_ROOT}/turbo/turbo_1.webp`,
    peakLabel: HUD_SQUARE_ICON_PEAK,
    kind: 'square',
    displayPx: HUD_SQUARE_ICON_PX,
  },
  {
    id: 'autoplay-mobile',
    title: 'Autoplay (mobile)',
    file: 'autoplay_mobile.webp',
    url: `${HUD_ASSET_ROOT}/autoplay/autoplay_mobile.webp`,
    peakLabel: HUD_SQUARE_ICON_PEAK,
    kind: 'square',
    displayPx: HUD_SQUARE_ICON_PX,
  },
  {
    id: 'bet-plus',
    title: 'Bet +',
    file: 'plus.webp',
    url: `${HUD_ASSET_ROOT}/bet/plus.webp`,
    peakLabel: HUD_SQUARE_ICON_PEAK,
    kind: 'square',
    displayPx: HUD_SQUARE_ICON_PX,
  },
  {
    id: 'bet-minus',
    title: 'Bet −',
    file: 'minus.webp',
    url: `${HUD_ASSET_ROOT}/bet/minus.webp`,
    peakLabel: HUD_SQUARE_ICON_PEAK,
    kind: 'square',
    displayPx: HUD_SQUARE_ICON_PX,
  },
  {
    id: 'menu',
    title: 'Menu',
    file: 'menu.webp',
    url: `${HUD_ASSET_ROOT}/settings/menu.webp`,
    peakLabel: HUD_SQUARE_ICON_PEAK,
    kind: 'square',
    displayPx: HUD_SQUARE_ICON_PX,
  },
  {
    id: 'info',
    title: 'Info',
    file: 'info.webp',
    url: `${HUD_ASSET_ROOT}/info/info.webp`,
    peakLabel: HUD_SQUARE_ICON_PEAK,
    kind: 'square',
    displayPx: HUD_SQUARE_ICON_PX,
  },
]
