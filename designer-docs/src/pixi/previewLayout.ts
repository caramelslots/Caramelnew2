import type { Spine } from '@esotericsoftware/spine-pixi-v8'
import { Graphics } from 'pixi.js'

const GRID = 48
const FIT_PADDING = 0.82

export function drawPreviewGrid(
  graphics: Graphics,
  width: number,
  height: number,
): void {
  graphics.clear()
  graphics.rect(0, 0, width, height)
  graphics.fill({ color: 0x1a1d22 })

  graphics.setStrokeStyle({ width: 1, color: 0x2c323a, alpha: 0.9 })
  for (let x = 0; x <= width; x += GRID) {
    graphics.moveTo(x, 0)
    graphics.lineTo(x, height)
  }
  for (let y = 0; y <= height; y += GRID) {
    graphics.moveTo(0, y)
    graphics.lineTo(width, y)
  }
  graphics.stroke()

  // Center crosshair
  const cx = width / 2
  const cy = height / 2
  graphics.setStrokeStyle({ width: 1, color: 0x4a5560, alpha: 0.8 })
  graphics.moveTo(cx, 0)
  graphics.lineTo(cx, height)
  graphics.moveTo(0, cy)
  graphics.lineTo(width, cy)
  graphics.stroke()
}

export function fitSpineToView(spine: Spine, viewWidth: number, viewHeight: number): void {
  spine.scale.set(1)
  spine.x = 0
  spine.y = 0
  spine.skeleton.setToSetupPose()
  spine.update(0)

  const bounds = spine.getBounds()
  const bw = Math.max(bounds.width, 1)
  const bh = Math.max(bounds.height, 1)
  const scale = Math.min((viewWidth * FIT_PADDING) / bw, (viewHeight * FIT_PADDING) / bh)

  spine.scale.set(scale)
  spine.x = viewWidth / 2 - (bounds.x + bounds.width / 2) * scale
  spine.y = viewHeight / 2 - (bounds.y + bounds.height / 2) * scale
}
