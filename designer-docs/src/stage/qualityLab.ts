import { CELL_SYMBOL_SIZE, SYMBOL_SIZE } from '../reel/constants'
import { SYMBOL_TEXTURE_NATIVE_PX } from '../catalog/symbolSpecs'
import { layoutStageContent } from './layout'
import type { StageLayoutKind } from './deviceFit'
import {
  qualityScaleForFrame,
  type DevicePreset,
  type QualityPreset,
} from './presets'

export type QualityVerdict = 'sharp' | 'ok' | 'soft' | 'mushy'

export type QualityReport = {
  density: number
  resolutionScale: number
  /** Approx on-screen glyph size in CSS px inside the device frame. */
  glyphCssPx: number
  /** How many native texels cover one CSS pixel of the glyph (× dens). */
  texelsPerCssPx: number
  verdict: QualityVerdict
  verdictLabel: string
  hint: string
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function verdictFromTexels(texelsPerCssPx: number): QualityVerdict {
  if (texelsPerCssPx >= 1.35) return 'sharp'
  if (texelsPerCssPx >= 1.0) return 'ok'
  if (texelsPerCssPx >= 0.7) return 'soft'
  return 'mushy'
}

const VERDICT_LABEL: Record<QualityVerdict, string> = {
  sharp: 'Sharp',
  ok: 'OK',
  soft: 'Soft',
  mushy: 'Mushy',
}

/**
 * Estimate how 196×196 static will look on this device × quality combo.
 */
export function analyzeQuality(args: {
  device: DevicePreset
  quality: QualityPreset
  layoutKind: StageLayoutKind
  boardCols?: number
  boardRows?: number
}): QualityReport {
  const { device, quality, layoutKind } = args
  const density = qualityScaleForFrame(device.width, device.height, quality)
  const resolutionScale = clamp(density, 0.35, 2.5)

  const placed = layoutStageContent(
    { width: device.width, height: device.height },
    {
      cols: args.boardCols ?? 5,
      rows: args.boardRows ?? 4,
    },
    layoutKind,
  )

  const glyphCssPx = SYMBOL_SIZE * CELL_SYMBOL_SIZE * placed.effectiveBoardScale
  const texelsPerCssPx =
    (SYMBOL_TEXTURE_NATIVE_PX / Math.max(glyphCssPx, 1)) * resolutionScale

  const verdict = verdictFromTexels(texelsPerCssPx)

  const hint = [
    `${device.label} ${device.width}×${device.height} @ ${quality.label}:`,
    `internal dens ${resolutionScale.toFixed(2)}× (layout ${placed.gameLayout}, main×${placed.main.scale.toFixed(2)}, board×${placed.board.scale.toFixed(2)}).`,
    `Glyph ≈ ${glyphCssPx.toFixed(0)} CSS px; 196px static → ${texelsPerCssPx.toFixed(2)} texels/px.`,
    verdict === 'sharp' || verdict === 'ok'
      ? 'Статика должна читаться чётко.'
      : verdict === 'soft'
        ? 'Лёгкое мыло — на мелком окне/низком quality это нормально проверить.'
        : 'Сильное мыло — на этом пресете 196px будет заметно хуже.',
  ].join(' ')

  return {
    density,
    resolutionScale,
    glyphCssPx,
    texelsPerCssPx,
    verdict,
    verdictLabel: VERDICT_LABEL[verdict],
    hint,
  }
}
