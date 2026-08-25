/** Stage slot ids designers can override. Defaults are procedural — not cat_mafia art. */

export type StageSlotId =
  | 'background'
  | 'deskBase'
  | 'deskContour'
  | 'spin'
  | 'betMinus'
  | 'betPlus'
  | 'info'
  | 'menu'
  | 'buyBonus'
  | 'autoplay'
  | 'turbo'

export type StagePackOverrides = Partial<Record<StageSlotId, string>>

export type ResolvedStageUrls = Record<StageSlotId, string>

export const STAGE_SLOT_META: {
  id: StageSlotId
  label: string
  group: 'environment' | 'hud'
  accept: string
}[] = [
  { id: 'background', label: 'Background', group: 'environment', accept: 'image/webp,image/png,image/jpeg' },
  { id: 'deskBase', label: 'Desk base', group: 'environment', accept: 'image/webp,image/png,image/jpeg' },
  { id: 'deskContour', label: 'Desk contour', group: 'environment', accept: 'image/webp,image/png,image/jpeg' },
  { id: 'spin', label: 'Spin', group: 'hud', accept: 'image/webp,image/png,image/jpeg' },
  { id: 'betMinus', label: 'Bet −', group: 'hud', accept: 'image/webp,image/png,image/jpeg' },
  { id: 'betPlus', label: 'Bet +', group: 'hud', accept: 'image/webp,image/png,image/jpeg' },
  { id: 'info', label: 'Info', group: 'hud', accept: 'image/webp,image/png,image/jpeg' },
  { id: 'menu', label: 'Menu', group: 'hud', accept: 'image/webp,image/png,image/jpeg' },
  { id: 'buyBonus', label: 'Buy bonus', group: 'hud', accept: 'image/webp,image/png,image/jpeg' },
  { id: 'autoplay', label: 'Autoplay', group: 'hud', accept: 'image/webp,image/png,image/jpeg' },
  { id: 'turbo', label: 'Turbo', group: 'hud', accept: 'image/webp,image/png,image/jpeg' },
]
