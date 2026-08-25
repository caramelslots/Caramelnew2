import type { Spine } from '@esotericsoftware/spine-pixi-v8'
import { Container, Sprite, Texture } from 'pixi.js'
import { CELL_SYMBOL_SIZE, SYMBOL_SIZE } from './constants'
import type { SpineTemplate } from './spinePool'
import { setSpineAutoUpdate, spawnSpine } from './spinePool'

export type CellAnimMode = 'idle' | 'land' | 'win'

const GLYPH = SYMBOL_SIZE * CELL_SYMBOL_SIZE

/**
 * Fit Spine into a board cell (~SYMBOL_SIZE × 0.85), matching cat_mafia visual fill.
 * Call while spine is in setup/idle pose — before playing land — so bounce isn't reset.
 */
export function fitSpineToCell(spine: Spine, fill = CELL_SYMBOL_SIZE): void {
  const target = SYMBOL_SIZE * fill

  spine.pivot.set(0, 0)
  spine.scale.set(1)
  spine.x = 0
  spine.y = 0
  spine.update(0)

  const bounds = spine.getLocalBounds()
  const bw = Math.max(bounds.width, 1)
  const bh = Math.max(bounds.height, 1)
  const scale = Math.min(target / bw, target / bh)

  spine.scale.set(scale)
  spine.pivot.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  spine.x = 0
  spine.y = 0
}

/** Static reel sprite sized like cat_mafia spin sprites (SYMBOL_SIZE × 0.85). */
export function createCellStaticSprite(
  texture: Texture,
  col: number,
  row: number,
): Sprite {
  const sprite = new Sprite(texture)
  sprite.anchor.set(0.5)
  sprite.width = GLYPH
  sprite.height = GLYPH
  sprite.x = (col + 0.5) * SYMBOL_SIZE
  sprite.y = (row + 0.5) * SYMBOL_SIZE
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
  holder.y = (row + 0.5) * SYMBOL_SIZE
  holder.addChild(spine)

  // Fit on setup pose first, then start the clip — don't refit mid-bounce.
  fitSpineToCell(spine)
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
