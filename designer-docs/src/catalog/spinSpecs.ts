import type { SpineAssetSource } from '../types'
import type { FitSpineOptions } from '../pixi/previewLayout'

/** Spine skeleton / static art bounds in current cat_mafia export. */
export const HUD_SPIN_ART_PX = 950
export const HUD_SPIN_PEAK = `${HUD_SPIN_ART_PX}×${HUD_SPIN_ART_PX}`

/** On-screen button diameter in cat_mafia layout (CSS px). */
export const HUD_SPIN_ON_SCREEN_DESKTOP = 162
export const HUD_SPIN_ON_SCREEN_PORTRAIT = 172
export const HUD_SPIN_ON_SCREEN = `≈${HUD_SPIN_ON_SCREEN_DESKTOP}–${HUD_SPIN_ON_SCREEN_PORTRAIT} CSS px`

/** Sharp 2× target for opaque button core (not full glow canvas). */
export const HUD_SPIN_MIN_TEXTURE_2X = 368

/** Legacy autoplay-counter static — slightly larger canvas in current export. */
export const HUD_SPIN_AUTOPLAY_STATIC_PX = 1000
export const HUD_SPIN_AUTOPLAY_PEAK = `${HUD_SPIN_AUTOPLAY_STATIC_PX}×${HUD_SPIN_AUTOPLAY_STATIC_PX}`

export const SPIN_TEXTURE_FORMAT = 'webp' as const

/** One-shot press clip in spin_button.json. */
export const SPIN_PRESS_CLIP = 'animation'

/** Matches spin_button.json skeleton bounds (-475 … +475). */
export const SPIN_SKELETON_BOUNDS = {
  x: -475,
  y: -475,
  width: HUD_SPIN_ART_PX,
  height: HUD_SPIN_ART_PX,
} as const

/** Press peaks at ~1.1 scale — extra margin so preview does not clip. */
export const GUIDE_SPIN_FIT_OPTIONS: FitSpineOptions = {
  skeletonX: SPIN_SKELETON_BOUNDS.x,
  skeletonY: SPIN_SKELETON_BOUNDS.y,
  skeletonWidth: SPIN_SKELETON_BOUNDS.width * 1.12,
  skeletonHeight: SPIN_SKELETON_BOUNDS.height * 1.12,
  padding: 0.72,
}

export type SpinFolderRow = {
  file: string
  role: string
  note: string
}

export const SPIN_FOLDER_ROWS: SpinFolderRow[] = [
  {
    file: 'spin_button.json',
    role: 'Spine skeleton',
    note: `Press-анимация (${SPIN_PRESS_CLIP}). Пиковый холст — как у HUD-иконок.`,
  },
  {
    file: 'spin_button.atlas',
    role: 'Spine atlas',
    note: 'Страница текстур: spin_button.webp.',
  },
  {
    file: 'spin_button.webp',
    role: 'Текстура атласа',
    note: 'Кадры press-анимации; размер страницы — по экспорту Spine.',
  },
  {
    file: 'spin_1.webp',
    role: 'Static — обычный спин',
    note: 'Still / Pixi fallback; HTML HUD использует Spine.',
  },
  {
    file: 'spin_2.webp',
    role: 'Static — автоигра',
    note: 'Кнопка с счётчиком раундов (hasCounter).',
  },
]

const ASSET_BASE = '/designer-assets/spin'

/** Docs example — designer_assets/spin/ */
export const GUIDE_SPIN_SOURCE: SpineAssetSource = {
  kind: 'catalog',
  symbolId: 'spin',
  skeletonUrl: `${ASSET_BASE}/spin_button.json`,
  atlasUrl: `${ASSET_BASE}/spin_button.atlas`,
  textureUrl: `${ASSET_BASE}/spin_button.webp`,
  textureFileName: 'spin_button.webp',
}

export const GUIDE_SPIN_STATIC_NORMAL_URL = `${ASSET_BASE}/spin_1.webp`
export const GUIDE_SPIN_STATIC_AUTOPLAY_URL = `${ASSET_BASE}/spin_2.webp`

/** @deprecated use HUD_SPIN_ART_PX */
export const HUD_SPIN_PX = HUD_SPIN_ART_PX
