import type { DevicePreset, DevicePresetId } from './presets'

export type StageLayoutKind = 'desktop' | 'laptop' | 'popout' | 'popoutS' | 'portrait'

export function layoutKindForDevice(id: DevicePresetId): StageLayoutKind {
  switch (id) {
    case 'desktop':
      return 'desktop'
    case 'laptop':
      return 'laptop'
    case 'popoutL':
      return 'popout'
    case 'popoutS':
      return 'popoutS'
    case 'mobileL':
    case 'mobileM':
    case 'mobileS':
      return 'portrait'
  }
}

export type DeviceFit = {
  /** CSS display size of the device frame (may be scaled down to fit wrap). */
  displayWidth: number
  displayHeight: number
  /** Logical device pixels (preset). */
  logicalWidth: number
  logicalHeight: number
  /** display / logical — <1 when the wrap is smaller than the preset. */
  fitScale: number
}

/**
 * Scale the device frame to fit inside the viewport wrap while keeping aspect.
 * Uses full logical size when it fits; otherwise contain-fit with padding.
 */
export function computeDeviceFit(
  wrap: { width: number; height: number },
  device: DevicePreset,
  padding = 16,
): DeviceFit {
  const availW = Math.max(120, wrap.width - padding * 2)
  const availH = Math.max(120, wrap.height - padding * 2)
  const fitScale = Math.min(1, availW / device.width, availH / device.height)

  return {
    logicalWidth: device.width,
    logicalHeight: device.height,
    fitScale,
    displayWidth: Math.round(device.width * fitScale),
    displayHeight: Math.round(device.height * fitScale),
  }
}
