import { Texture } from 'pixi.js'
import {
  AtlasAttachmentLoader,
  SkeletonJson,
  Spine,
  SpineTexture,
  TextureAtlas,
  type SkeletonData,
} from '@esotericsoftware/spine-pixi-v8'
import { librarySymbolToSpineSource } from '../library/createLibrarySymbol'
import type { LibrarySymbol } from '../library/types'
import { listAnimationNames } from '../pixi/spineLoader'
import { resolveAnimationRoles } from '../pixi/animationRoles'
import type { AnimationRoleMap } from '../types'
import { resolveSymbolSizeFit } from './symbolSizeFit'

export type SpineTemplate = {
  symbolId: string
  skeletonData: SkeletonData
  atlas: TextureAtlas
  texture: Texture
  roles: AnimationRoleMap
  animationNames: string[]
  /** cat_mafia SpineProvider sizeRatio (height / SYMBOL_SIZE). */
  sizeRatio: number
  offsetY: number
}

const templates = new Map<string, Promise<SpineTemplate | null>>()

async function loadTemplate(symbol: LibrarySymbol): Promise<SpineTemplate | null> {
  const source = librarySymbolToSpineSource(symbol)
  if (!source) return null

  const [atlasRes, skeletonRes, textureRes] = await Promise.all([
    fetch(source.atlasUrl),
    fetch(source.skeletonUrl),
    fetch(source.textureUrl),
  ])
  if (!atlasRes.ok || !skeletonRes.ok || !textureRes.ok) {
    throw new Error(`Spine fetch failed for ${symbol.label}`)
  }

  const atlasText = await atlasRes.text()
  const skeletonJson = await skeletonRes.json()
  const blob = await textureRes.blob()
  const bitmap = await createImageBitmap(blob)
  const texture = Texture.from(bitmap)
  if (!texture.source) {
    bitmap.close()
    throw new Error(`No texture source for ${symbol.label}`)
  }

  const atlas = new TextureAtlas(atlasText)
  const spineTexture = SpineTexture.from(texture.source)
  for (const page of atlas.pages) {
    page.setTexture(spineTexture)
  }

  const parser = new SkeletonJson(new AtlasAttachmentLoader(atlas))
  parser.scale = 1
  const skeletonData = parser.readSkeletonData(skeletonJson)
  const probe = new Spine({ skeletonData, autoUpdate: false })
  const animationNames = listAnimationNames(probe)
  const autoRoles = resolveAnimationRoles(animationNames)
  const roles: AnimationRoleMap = {
    idle: symbol.roles?.idle ?? autoRoles.idle,
    bounce: symbol.roles?.bounce ?? autoRoles.bounce,
    win: symbol.roles?.win ?? autoRoles.win,
  }
  probe.destroy({ children: true })

  const fit = resolveSymbolSizeFit(symbol.label)

  return {
    symbolId: symbol.id,
    skeletonData,
    atlas,
    texture,
    roles,
    animationNames,
    sizeRatio: fit.sizeRatio,
    offsetY: fit.offsetY,
  }
}

/** Load once per symbol id; shared SkeletonData for many cell instances. */
export function ensureSpineTemplate(
  symbol: LibrarySymbol,
): Promise<SpineTemplate | null> {
  const existing = templates.get(symbol.id)
  if (existing) return existing

  const pending = loadTemplate(symbol).catch((err) => {
    templates.delete(symbol.id)
    console.warn('[spinePool]', err)
    return null
  })
  templates.set(symbol.id, pending)
  return pending
}

export function spawnSpine(template: SpineTemplate): Spine {
  // Spine.autoUpdate setter always Ticker.shared.add() with NO dedupe.
  // Construct frozen, then enable once — never assign true→true (that is 2× idle).
  const spine = new Spine({
    skeletonData: template.skeletonData,
    autoUpdate: false,
  })
  setSpineAutoUpdate(spine, true)
  return spine
}

/**
 * Guarded autoUpdate — spine-pixi-v8 stacks internalUpdate on every `= true`.
 */
export function setSpineAutoUpdate(spine: Spine, enabled: boolean): void {
  if (spine.autoUpdate === enabled) return
  spine.autoUpdate = enabled
}

/** Destroy only the display instance — keep shared atlas/texture alive. */
export function destroySpineInstance(spine: Spine): void {
  try {
    spine.destroy({ children: true })
  } catch {
    // ignore
  }
}

export function clearSpinePool(): void {
  for (const pending of templates.values()) {
    void pending.then((template) => {
      if (!template) return
      try {
        template.atlas.dispose()
      } catch {
        // ignore
      }
      try {
        template.texture.destroy(true)
      } catch {
        // ignore
      }
    })
  }
  templates.clear()
}

export async function preloadSpineTemplates(
  symbols: LibrarySymbol[],
): Promise<Map<string, SpineTemplate>> {
  const withSpine = symbols.filter((item) => item.status.spineOk)
  const results = await Promise.all(
    withSpine.map(async (symbol) => {
      const template = await ensureSpineTemplate(symbol)
      return template ? ([symbol.id, template] as const) : null
    }),
  )
  const map = new Map<string, SpineTemplate>()
  for (const entry of results) {
    if (entry) map.set(entry[0], entry[1])
  }
  return map
}
