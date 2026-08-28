/**
 * Stage URL resolver — procedural defaults; designers upload background overrides.
 */

import type { ResolvedStageUrls, StagePackOverrides, StageSlotId } from './stagePack'
import { DESK_PARCHMENT } from './layout'

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
  return canvasUrl(1920, 956, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#141c28')
    g.addColorStop(0.45, '#1e2838')
    g.addColorStop(0.72, '#2a3038')
    g.addColorStop(1, '#322820')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    const glow = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.35, w * 0.55)
    glow.addColorStop(0, 'rgba(70, 88, 120, 0.22)')
    glow.addColorStop(1, 'rgba(70, 88, 120, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = 'rgba(18, 14, 10, 0.55)'
    ctx.fillRect(0, h * 0.82, w, h * 0.18)
  })
}

function deskHoleRect(w: number, h: number) {
  const holeW = w * DESK_PARCHMENT.widthFrac
  const holeH = h * DESK_PARCHMENT.heightFrac
  const holeX = (w - holeW) / 2 + DESK_PARCHMENT.offsetXFrac * w
  const holeY = (h - holeH) / 2 + DESK_PARCHMENT.offsetYFrac * h
  return { holeX, holeY, holeW, holeH }
}

function appendRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
) {
  ctx.beginPath()
  appendRoundRectPath(ctx, x, y, w, h, r)
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
  appendRoundRectPath(ctx, x, y, w, h, r)
  ctx.stroke()
}

/** Ring between outer and inner rounded rects (even-odd fill). */
function fillFrameRing(
  ctx: CanvasRenderingContext2D,
  holeX: number,
  holeY: number,
  holeW: number,
  holeH: number,
  thickness: number,
  fill: string | CanvasGradient,
  outerRadius: number,
  innerRadius: number,
) {
  ctx.beginPath()
  appendRoundRectPath(
    ctx,
    holeX - thickness,
    holeY - thickness,
    holeW + thickness * 2,
    holeH + thickness * 2,
    outerRadius,
  )
  appendRoundRectPath(ctx, holeX, holeY, holeW, holeH, innerRadius)
  ctx.fillStyle = fill
  ctx.fill('evenodd')
}

/**
 * Thin rim around the playfield hole only — rest of the desk canvas stays transparent
 * so the street background shows through (no giant parchment slab).
 */
function makeDeskArt(): string {
  const W = 1200
  const H = 900
  const { holeX, holeY, holeW, holeH } = deskHoleRect(W, H)
  /** ~12 px rim at 1200² art → ~10–14 px on screen after desk slot scale. */
  const RIM = 12

  return canvasUrl(W, H, (ctx) => {
    ctx.clearRect(0, 0, W, H)

    const holeGrad = ctx.createLinearGradient(holeX, holeY, holeX, holeY + holeH)
    holeGrad.addColorStop(0, '#1a2230')
    holeGrad.addColorStop(1, '#0b0f15')
    fillRoundRect(ctx, holeX, holeY, holeW, holeH, 6, holeGrad)

    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 2
    const wood = ctx.createLinearGradient(
      holeX - RIM,
      holeY - RIM,
      holeX - RIM,
      holeY + holeH + RIM,
    )
    wood.addColorStop(0, '#5a4030')
    wood.addColorStop(1, '#3a281e')
    fillFrameRing(ctx, holeX, holeY, holeW, holeH, RIM, wood, 8, 6)
    ctx.restore()

    const lip = ctx.createLinearGradient(holeX, holeY, holeX + holeW, holeY)
    lip.addColorStop(0, '#dcc9a0')
    lip.addColorStop(0.5, '#f0e4c8')
    lip.addColorStop(1, '#c9b184')
    fillFrameRing(ctx, holeX, holeY, holeW, holeH, RIM - 3, lip, 7, 6)

    ctx.strokeStyle = 'rgba(200, 160, 70, 0.9)'
    ctx.lineWidth = 1.5
    strokeRoundRect(ctx, holeX - 1, holeY - 1, holeW + 2, holeH + 2, 6)

    ctx.strokeStyle = 'rgba(255, 240, 200, 0.28)'
    ctx.lineWidth = 1
    strokeRoundRect(ctx, holeX + 0.5, holeY + 0.5, holeW - 1, holeH - 1, 5)
  })
}

let cached: ResolvedStageUrls | null = null
let cachedDesk: string | null = null

export function getDefaultStageUrls(): ResolvedStageUrls {
  if (cached) return cached
  cachedDesk = makeDeskArt()
  cached = {
    background: makeBackground(),
    deskBase: cachedDesk,
    deskContour: cachedDesk,
  }
  return cached
}

/** @deprecated alias — same as getDefaultStageUrls. */
export function getProceduralStageUrls(): ResolvedStageUrls {
  return getDefaultStageUrls()
}

export function resetDefaultStageUrls(): void {
  cached = null
  cachedDesk = null
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    cached = null
    cachedDesk = null
  })
  cached = null
  cachedDesk = null
}

export function resolveStageUrls(overrides: StagePackOverrides = {}): ResolvedStageUrls {
  const defaults = getDefaultStageUrls()
  const resolved = { ...defaults }
  for (const key of Object.keys(defaults) as StageSlotId[]) {
    const url = overrides[key]
    if (url) resolved[key] = url
  }
  return resolved
}
