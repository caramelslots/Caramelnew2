/**
 * Soft-edge board mask — port of cat_mafia `boardFeatherMask.ts`.
 * Feather lives only in overflow runways; visible grid stays full opacity.
 */
import { Texture } from 'pixi.js'

export type BoardFeatherMaskParams = {
  width: number
  height: number
  topOverflow: number
  bottomOverflow: number
  /** Visible playfield height (px). */
  gridHeight: number
  /** Soft fade length at top (and bottom unless `bottomFeather` is set) (px). */
  feather: number
  /** Override bottom fade length; `0` = hard clip at mask bottom. */
  bottomFeather?: number
}

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

export function createBoardFeatherMaskTexture(params: BoardFeatherMaskParams): Texture {
  const width = Math.max(1, Math.ceil(params.width))
  const height = Math.max(1, Math.ceil(params.height))
  const topOverflow = Math.max(0, params.topOverflow)
  const bottomOverflow = Math.max(0, params.bottomOverflow)
  const gridHeight = Math.max(1, params.gridHeight)
  const feather = Math.max(1, params.feather)
  const bottomFeatherLen = params.bottomFeather ?? feather

  const gridTop = topOverflow
  const gridBottom = gridTop + gridHeight

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return Texture.WHITE

  const imageData = ctx.createImageData(width, height)
  const data = imageData.data

  for (let y = 0; y < height; y += 1) {
    let alpha = 1

    if (topOverflow > 0 && y < gridTop) {
      const topFeather = Math.min(feather, topOverflow)
      const fadeEnd = topFeather
      if (y < fadeEnd) {
        alpha = smoothstep(y / topFeather)
      }
    }

    if (bottomOverflow > 0 && y >= gridBottom) {
      if (bottomFeatherLen <= 0) {
        alpha = 1
      } else {
        const bottomFeather = Math.min(bottomFeatherLen, bottomOverflow)
        const fadeStart = gridBottom + bottomOverflow - bottomFeather
        if (y >= fadeStart) {
          alpha *= smoothstep((gridBottom + bottomOverflow - y) / bottomFeather)
        }
      }
    }

    const a = Math.round(alpha * 255)
    const row = y * width * 4
    for (let x = 0; x < width; x += 1) {
      const i = row + x * 4
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = a
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return Texture.from(canvas)
}

export function destroyBoardFeatherMaskTexture(texture: Texture | null | undefined): void {
  if (!texture || texture === Texture.WHITE) return
  texture.destroy(true)
}
