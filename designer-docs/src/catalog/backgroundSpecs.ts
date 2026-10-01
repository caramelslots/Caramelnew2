import type { StageBackgroundSpinePack } from '../stage/stagePack'

export const BACKGROUND_TEXTURE_FORMAT = 'webp' as const

/** Still frame for loading / fallback — cat_mafia day.webp. */
export const BACKGROUND_STATIC_WIDTH = 1920
export const BACKGROUND_STATIC_HEIGHT = 1080

/** Opaque street plate in Spine world units — matches cat_mafia BG_NATIVE. */
export const BACKGROUND_PLATE_NATIVE = {
  width: 1920 * 1.9974 * 0.5082,
  height: 940 * 1.9974 * 0.5082,
} as const

/** Preferred idle clip in reference export. */
export const BACKGROUND_IDLE_CLIP = 'idle_final_delay2'

export const BACKGROUND_IDLE_ALIASES = [
  'idle_final_delay2',
  'idle_final',
  'idle',
  'day_idle',
  'loop',
] as const

export type BackgroundFolderRow = {
  file: string
  role: string
  note: string
}

export const BACKGROUND_FOLDER_ROWS: BackgroundFolderRow[] = [
  {
    file: 'background.json',
    role: 'Spine skeleton',
    note: `Анимация фона (обычно ${BACKGROUND_IDLE_CLIP}, loop).`,
  },
  {
    file: 'background.atlas',
    role: 'Spine atlas',
    note: 'Страницы текстур: background.webp, background_2.webp, background_3.webp.',
  },
  {
    file: 'background.webp',
    role: 'Текстура атласа (page 1)',
    note: 'Atlas page — не путать со static.',
  },
  {
    file: 'background_2.webp',
    role: 'Текстура атласа (page 2)',
    note: 'Вторая страница multi-page atlas.',
  },
  {
    file: 'background_3.webp',
    role: 'Текстура атласа (page 3)',
    note: 'Третья страница multi-page atlas.',
  },
  {
    file: 'background_static.webp',
    role: 'Static fallback',
    note: `${BACKGROUND_STATIC_WIDTH}×${BACKGROUND_STATIC_HEIGHT} — still на загрузке / без Spine.`,
  },
]

const ASSET_BASE = '/designer-assets/background'

/** Docs example — designer_assets/background/ */
export const GUIDE_BACKGROUND_SPINE_PACK: StageBackgroundSpinePack = {
  skeletonUrl: `${ASSET_BASE}/background.json`,
  atlasUrl: `${ASSET_BASE}/background.atlas`,
  pageUrls: {
    'background.webp': `${ASSET_BASE}/background.webp`,
    'background_2.webp': `${ASSET_BASE}/background_2.webp`,
    'background_3.webp': `${ASSET_BASE}/background_3.webp`,
  },
  animationName: BACKGROUND_IDLE_CLIP,
  label: 'Street background',
}

export const GUIDE_BACKGROUND_STATIC_URL = `${ASSET_BASE}/background_static.webp`
