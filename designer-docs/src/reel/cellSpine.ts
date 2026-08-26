import type { Spine } from '@esotericsoftware/spine-pixi-v8'
import { Container, Sprite, Texture } from 'pixi.js'
import { CELL_SYMBOL_SIZE, SYMBOL_SIZE } from './constants'
import type { SpineTemplate } from './spinePool'
import { setSpineAutoUpdate, spawnSpine } from './spinePool'
import { DEFAULT_SPINE_SIZE_RATIO } from './symbolSizeFit'

export type CellAnimMode = 'idle' | 'land' | 'win'

/** Spin WebP glyph size — matches cat_mafia `propSpinSizeRatios` / `letterSpinSizeRatios`. */
const SPIN_GLYPH = SYMBOL_SIZE * CELL_SYMBOL_SIZE

/**
 * Scale Spine like cat_mafia SpineProvider:
 * `scale = (SYMBOL_SIZE * sizeRatio) / skeletonData.height`
 *
 * Do NOT fit getLocalBounds into the cell — designer skeletons are much
 * taller than the visible glyph; inflated sizeRatio lands the silhouette
 * at ~0.85 × cell, same as the game.
 */
export function fitSpineToCell(
  spine: Spine,
  sizeRatio = DEFAULT_SPINE_SIZE_RATIO,
): void {
  const data = spine.skeleton.data
  const skelH = Math.max(data.height, 1)
  const targetHeight = SYMBOL_SIZE * sizeRatio
  const scale = targetHeight / skelH

  spine.pivot.set(0, 0)
  spine.x = 0
  spine.y = 0
  spine.scale.set(scale)
}

/** Static reel sprite sized like cat_mafia spin sprites (SYMBOL_SIZE × 0.85). */
export function createCellStaticSprite(
  texture: Texture,
  col: number,
  row: number,
  offsetY = 0,
): Sprite {
  const sprite = new Sprite(texture)
  sprite.anchor.set(0.5)
  sprite.width = SPIN_GLYPH
  sprite.height = SPIN_GLYPH
  sprite.x = (col + 0.5) * SYMBOL_SIZE
  sprite.y = (row + 0.5) * SYMBOL_SIZE + offsetY
  return sprite
}

export type CreateCellSpineOptions = {
  /** After land `stop` finishes, switch to looping idle on the same instance. */
  animateIdleAfterLand?: boolean
  /** When false, freeze after first pose (budget) — still shows idle, no ticker. */
  autoUpdate?: boolean
}

/**
 * Place Spine in a cell — cat_mafia SYMBOL_INFO_MAP mapping:
 * - idle/static → animation `idle` (loop)
 * - land → `stop` once, then idle on same spine
 * - win → `win`/`activation`
 */
export function createCellSpine(
  template: SpineTemplate,
  col: number,
  row: number,
  mode: CellAnimMode,
  options: CreateCellSpineOptions = {},
): { holder: Container; spine: Spine } {
  const spine = spawnSpine(template)
  setSpineAutoUpdate(spine, options.autoUpdate !== false)

  const holder = new Container()
  holder.x = (col + 0.5) * SYMBOL_SIZE
  holder.y = (row + 0.5) * SYMBOL_SIZE + (template.offsetY ?? 0)
  holder.addChild(spine)

  fitSpineToCell(spine, template.sizeRatio)
  playCellAnimation(spine, template, mode, {
    animateIdleAfterLand: options.animateIdleAfterLand !== false,
  })

  // Frozen budget cells: park on first idle frame.
  if (!spine.autoUpdate) {
    spine.update(0)
  }

  return { holder, spine }
}

type PlayOpts = {
  animateIdleAfterLand?: boolean
}

export function playCellAnimation(
  spine: Spine,
  template: SpineTemplate,
  mode: CellAnimMode,
  opts: PlayOpts = {},
): void {
  const { roles } = template
  try {
    if (mode === 'win') {
      const clip = roles.win ?? roles.idle
      if (clip) spine.state.setAnimation(0, clip, true)
      return
    }

    if (mode === 'land') {
      const land = roles.bounce
      const idle = roles.idle
      if (land) {
        // cat_mafia: land = stop (one-shot), then symbolState → static (= idle spine).
        spine.state.setAnimation(0, land, false)
        if (opts.animateIdleAfterLand !== false && idle) {
          spine.state.addAnimation(0, idle, true, 0)
        }
        return
      }
      if (idle) spine.state.setAnimation(0, idle, true)
      return
    }

    // idle / static rest — cat_mafia makeRenderStatic → animationName: 'idle'
    const idle = roles.idle ?? roles.bounce ?? template.animationNames[0]
    if (idle) spine.state.setAnimation(0, idle, true)
  } catch {
    // Missing clip — leave setup pose
  }
}
