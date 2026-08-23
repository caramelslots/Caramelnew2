export type DevicePresetId =
  | 'desktop'
  | 'laptop'
  | 'popoutL'
  | 'popoutS'
  | 'mobileL'
  | 'mobileM'
  | 'mobileS'

export type DevicePreset = {
  id: DevicePresetId
  label: string
  width: number
  height: number
  orientation: 'landscape' | 'portrait'
}

/** Stake-style embed viewports (from plan / cat_mafia reference). */
export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'desktop', label: 'Desktop', width: 1200, height: 675, orientation: 'landscape' },
  { id: 'laptop', label: 'Laptop', width: 1024, height: 576, orientation: 'landscape' },
  { id: 'popoutL', label: 'Popout L', width: 800, height: 450, orientation: 'landscape' },
  { id: 'popoutS', label: 'Popout S', width: 400, height: 225, orientation: 'landscape' },
  { id: 'mobileL', label: 'Mobile L', width: 425, height: 812, orientation: 'portrait' },
  { id: 'mobileM', label: 'Mobile M', width: 375, height: 667, orientation: 'portrait' },
  { id: 'mobileS', label: 'Mobile S', width: 320, height: 568, orientation: 'portrait' },
]

export type QualityPresetId = '4k' | '2k' | '1080p' | '720p'

export type QualityPreset = {
  id: QualityPresetId
  label: string
  /** Reference long-edge pixels for internal render density. */
  longEdge: number
}

export const QUALITY_PRESETS: QualityPreset[] = [
  { id: '4k', label: '4K', longEdge: 3840 },
  { id: '2k', label: '2K', longEdge: 2560 },
  { id: '1080p', label: '1080p', longEdge: 1920 },
  { id: '720p', label: '720p', longEdge: 1280 },
]

/**
 * Effective canvas resolution multiplier relative to the device frame,
 * so a Desktop frame can still be previewed at 720p vs 4K density.
 */
export function qualityScaleForFrame(
  frameWidth: number,
  frameHeight: number,
  quality: QualityPreset,
): number {
  const frameLong = Math.max(frameWidth, frameHeight)
  if (frameLong <= 0) return 1
  return quality.longEdge / frameLong
}
