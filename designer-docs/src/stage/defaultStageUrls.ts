/**
 * Neutral placeholder stage visuals (not cat_mafia).
 * Canvas PNG data URLs — Pixi needs bitmap dimensions (SVG data URLs break width).
 */

import type { ResolvedStageUrls, StageSlotId } from './stagePack'

function canvasUrl(
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  paint(ctx, width, height)
  return canvas.toDataURL('image/png')
}

function makeBackground(): string {
  return canvasUrl(1920, 1080, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#1a2433')
    g.addColorStop(0.55, '#2a3545')
    g.addColorStop(1, '#3d3428')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(42, 36, 28, 0.85)'
    ctx.fillRect(0, h * 0.67, w, h * 0.33)
    ctx.fillStyle = '#9aa7b8'
    ctx.font = '600 42px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Default background', w / 2, 160)
    ctx.fillStyle = '#6f7c8c'
    ctx.font = '22px system-ui, sans-serif'
    ctx.fillText('Upload your own in Stage assets', w / 2, 210)
  })
}

function makeDeskBase(): string {
  const W = 1200
  const H = 900
  // Keep in sync with layout.ts DESK_PARCHMENT (tight lab frame).
  const widthFrac = 1 / 1.12
  const heightFrac = 1 / 1.18
  const holeW = W * widthFrac
  const holeH = H * heightFrac
  const holeX = (W - holeW) / 2
  const holeY = (H - holeH) / 2

  return canvasUrl(W, H, (ctx, w, h) => {
    roundRect(ctx, 0, 0, w, h, 40, '#c4a574')
    roundRect(ctx, 20, 24, w - 40, h - 48, 28, '#8b6b3f')
    roundRect(ctx, holeX, holeY, holeW, holeH, 10, '#12161e')
  })
}

function makeDeskContour(): string {
  const W = 1200
  const H = 900
  const widthFrac = 1 / 1.12
  const heightFrac = 1 / 1.18
  const holeW = W * widthFrac
  const holeH = H * heightFrac
  const holeX = (W - holeW) / 2
  const holeY = (H - holeH) / 2

  return canvasUrl(W, H, (ctx) => {
    ctx.clearRect(0, 0, W, H)
    ctx.strokeStyle = '#e8d2a8'
    ctx.lineWidth = 12
    strokeRoundRect(ctx, 16, 20, W - 32, H - 40, 32)
    ctx.strokeStyle = 'rgba(232, 210, 168, 0.9)'
    ctx.lineWidth = 6
    strokeRoundRect(ctx, holeX - 4, holeY - 4, holeW + 8, holeH + 8, 12)
  })
}

function roundIcon(label: string, fill: string, size = 128): string {
  return canvasUrl(size, size, (ctx, w) => {
    ctx.beginPath()
    ctx.arc(w / 2, w / 2, w / 2 - 4, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = '#0f1218'
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = `700 ${Math.round(w * 0.22)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, w / 2, w / 2 + 1)
  })
}

function panelIcon(label: string, w = 220, h = 88): string {
  return canvasUrl(w, h, (ctx) => {
    roundRect(ctx, 2, 2, w - 4, h - 4, 14, '#2b3340')
    ctx.strokeStyle = '#d4a017'
    ctx.lineWidth = 3
    strokeRoundRect(ctx, 2, 2, w - 4, h - 4, 14)
    ctx.fillStyle = '#f2e6c8'
    ctx.font = '700 18px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, w / 2, h / 2)
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.stroke()
}

let cached: ResolvedStageUrls | null = null

/** Neutral defaults — never pulled from cat_mafia. */
export function getDefaultStageUrls(): ResolvedStageUrls {
  if (cached) return cached
  cached = {
    background: makeBackground(),
    deskBase: makeDeskBase(),
    deskContour: makeDeskContour(),
    spin: roundIcon('SPIN', '#c45c26', 160),
    betMinus: roundIcon('−', '#3a4554', 96),
    betPlus: roundIcon('+', '#3a4554', 96),
    info: roundIcon('i', '#3a4554', 96),
    menu: roundIcon('≡', '#3a4554', 96),
    buyBonus: panelIcon('BUY BONUS'),
    autoplay: panelIcon('AUTO', 140, 88),
    turbo: roundIcon('T', '#3a4554', 96),
  }
  return cached
}

export function resolveStageUrls(
  overrides: Partial<Record<StageSlotId, string>>,
): ResolvedStageUrls {
  const defaults = getDefaultStageUrls()
  const resolved = { ...defaults }
  for (const key of Object.keys(defaults) as StageSlotId[]) {
    const url = overrides[key]
    if (url) resolved[key] = url
  }
  return resolved
}
