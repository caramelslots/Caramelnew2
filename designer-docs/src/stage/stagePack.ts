/** Animated stage background (Spine street), optional override over static image. */

export type StageBackgroundSpinePack = {
  skeletonUrl: string
  atlasUrl: string
  /** Atlas page file name → object URL (supports multi-page atlases). */
  pageUrls: Record<string, string>
  /** Preferred idle clip; null = auto-pick from skeleton. */
  animationName?: string | null
  /** Display label for Inspect / Stage assets. */
  label?: string
}

export type StageSlotId = 'background' | 'deskBase' | 'deskContour'

export type StagePackOverrides = Partial<Record<StageSlotId, string>> & {
  /** When set, Pixi plays this Spine instead of (or over) the static background. */
  backgroundSpine?: StageBackgroundSpinePack
}

export type ResolvedStageUrls = Record<StageSlotId, string>

export const STAGE_SLOT_META: {
  id: StageSlotId
  label: string
  group: 'environment'
  accept: string
}[] = [
  {
    id: 'background',
    label: 'Background (still)',
    group: 'environment',
    accept: 'image/webp,image/png,image/jpeg',
  },
  { id: 'deskBase', label: 'Desk base', group: 'environment', accept: 'image/webp,image/png,image/jpeg' },
  {
    id: 'deskContour',
    label: 'Desk contour',
    group: 'environment',
    accept: 'image/webp,image/png,image/jpeg',
  },
]

export function revokeBackgroundSpine(pack: StageBackgroundSpinePack | undefined): void {
  if (!pack) return
  for (const url of [pack.skeletonUrl, pack.atlasUrl, ...Object.values(pack.pageUrls)]) {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
  }
}
