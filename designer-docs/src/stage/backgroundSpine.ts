/**
 * Load + place animated street background (Spine), matching cat_mafia cover math.
 */
import { Texture } from 'pixi.js'
import {
  AtlasAttachmentLoader,
  SkeletonJson,
  Skin,
  Spine,
  SpineTexture,
  TextureAtlas,
} from '@esotericsoftware/spine-pixi-v8'
import { loadPixiTextureFromUrl } from '../pixi/spineLoader'
import { setSpineAutoUpdate } from '../reel/spinePool'
import type { StageBackgroundSpinePack } from './stagePack'
import { BG_STILL_MATCH_SCALE, BG_VIEW_ZOOM, backgroundCoverScaleXY } from './layout'

/** Opaque street plate in spine world units — cat_mafia neonBackgroundLayout.BG_NATIVE. */
export const BG_PLATE_NATIVE = {
  width: 1920 * 1.9974 * 0.5082,
  height: 940 * 1.9974 * 0.5082,
} as const

const IDLE_PREFER = [
  'idle_final_delay2',
  'idle_final',
  'idle',
  'Idle',
  'day_idle',
  'loop',
]

export type LoadedBackgroundSpine = {
  spine: Spine
  atlas: TextureAtlas
  textures: Texture[]
  animationName: string | null
  dispose: () => void
}

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Background skeleton fetch failed (${response.status})`)
  return response.json()
}

async function readText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Background atlas fetch failed (${response.status})`)
  return response.text()
}

function resolvePageUrl(pageUrls: Record<string, string>, pageName: string): string {
  if (pageUrls[pageName]) return pageUrls[pageName]!
  const lower = pageName.toLowerCase()
  const key = Object.keys(pageUrls).find((item) => item.toLowerCase() === lower)
  if (!key) {
    throw new Error(`Нет текстуры для страницы atlas «${pageName}»`)
  }
  return pageUrls[key]!
}

/**
 * Manual multi-page atlas load — blob: URLs from folder upload do not work
 * reliably through Pixi Assets (same approach as symbol spineLoader).
 */
async function loadBackgroundAtlas(
  pack: StageBackgroundSpinePack,
): Promise<{ atlas: TextureAtlas; textures: Texture[] }> {
  const atlasText = await readText(pack.atlasUrl)
  const atlas = new TextureAtlas(atlasText)
  const textures: Texture[] = []

  if (atlas.pages.length === 0) {
    throw new Error('Background .atlas has no texture pages')
  }

  for (const page of atlas.pages) {
    const url = resolvePageUrl(pack.pageUrls, page.name)
    const texture = await loadPixiTextureFromUrl(url)
    page.setTexture(SpineTexture.from(texture.source))
    textures.push(texture)
  }

  return { atlas, textures }
}

/** Page texture file names listed in a Spine .atlas. */
export function atlasPageNames(atlasText: string): string[] {
  const pages: string[] = []
  for (const line of atlasText.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (/^.+\.(webp|png|jpe?g)$/i.test(trimmed)) pages.push(trimmed)
  }
  return pages
}

export function pickBackgroundIdleAnimation(names: string[], preferred?: string | null): string | null {
  if (preferred && names.includes(preferred)) return preferred
  for (const candidate of IDLE_PREFER) {
    if (names.includes(candidate)) return candidate
  }
  const fuzzy = names.find((name) => /idle/i.test(name))
  return fuzzy ?? names[0] ?? null
}

/** Street background uses combined default + day/night skins (cat_mafia BackgroundSkinController). */
export function applyBackgroundSkin(spine: Spine, skinName: 'day' | 'night' = 'day'): void {
  const combined = new Skin('designerBackground')
  const defaultSkin = spine.skeleton.data.findSkin('default')
  const themeSkin = spine.skeleton.data.findSkin(skinName)
  if (defaultSkin) combined.addSkin(defaultSkin)
  if (themeSkin) combined.addSkin(themeSkin)
  spine.skeleton.setSkin(combined)
  spine.skeleton.setSlotsToSetupPose()
}

export function backgroundSpineHasVisibleBounds(spine: Spine): boolean {
  const bounds = spine.getBounds()
  return bounds.width > 1 && bounds.height > 1
}

export async function loadBackgroundSpine(
  pack: StageBackgroundSpinePack,
): Promise<LoadedBackgroundSpine> {
  const [{ atlas, textures }, skeletonJson] = await Promise.all([
    loadBackgroundAtlas(pack),
    readJson(pack.skeletonUrl),
  ])

  for (const page of atlas.pages) {
    if (!page.texture) {
      throw new Error(`Atlas page "${page.name}" has no texture`)
    }
  }

  const parser = new SkeletonJson(new AtlasAttachmentLoader(atlas))
  parser.scale = 1
  const skeletonData = parser.readSkeletonData(skeletonJson)
  const spine = new Spine({ skeletonData, autoUpdate: false })
  applyBackgroundSkin(spine, 'day')
  setSpineAutoUpdate(spine, true)

  const animationNames = skeletonData.animations.map((item) => item.name)
  const animationName = pickBackgroundIdleAnimation(animationNames, pack.animationName)
  if (animationName) {
    spine.state.setAnimation(0, animationName, true)
  }
  spine.update(0)

  let disposed = false
  return {
    spine,
    atlas,
    textures,
    animationName,
    dispose: () => {
      if (disposed) return
      disposed = true
      try {
        setSpineAutoUpdate(spine, false)
        spine.destroy({ children: true })
      } catch {
        // ignore
      }
      try {
        atlas.dispose()
      } catch {
        // ignore
      }
      for (const texture of textures) {
        try {
          texture.destroy(true)
        } catch {
          // ignore
        }
      }
    },
  }
}

/**
 * Cover scale for animated street — same non-uniform math as cat_mafia
 * (`getBackgroundPixiScale`), using plate native size.
 */
export function backgroundSpineCoverScale(canvas: {
  width: number
  height: number
}): { x: number; y: number } {
  const cover = Math.max(
    canvas.width / BG_PLATE_NATIVE.width,
    canvas.height / BG_PLATE_NATIVE.height,
  )
  return {
    x: cover * BG_VIEW_ZOOM * BG_STILL_MATCH_SCALE,
    y: (canvas.height / BG_PLATE_NATIVE.height) * BG_STILL_MATCH_SCALE,
  }
}

/** Place spine at canvas center with cat_mafia cover scale. */
export function layoutBackgroundSpine(
  spine: Spine,
  canvas: { width: number; height: number },
): void {
  const scale = backgroundSpineCoverScale(canvas)
  spine.x = canvas.width / 2
  spine.y = canvas.height / 2
  spine.scale.set(scale.x, scale.y)
}

/**
 * Still-image cover. Street stills (day.webp ~1920×956) use BG_PLATE_NATIVE
 * so the plate matches Spine cover; other uploads use their own texture size.
 */
export function layoutBackgroundSprite(
  sprite: { scale: { set: (x: number, y: number) => void }; x: number; y: number },
  canvas: { width: number; height: number },
  texture: { width: number; height: number },
  options?: { useStreetPlateNative?: boolean },
): void {
  const plate =
    options?.useStreetPlateNative !== false &&
    Math.abs(texture.width - 1920) < 8 &&
    (Math.abs(texture.height - 1080) < 24 || Math.abs(texture.height - 956) < 24)
      ? BG_PLATE_NATIVE
      : texture
  const scale = backgroundCoverScaleXY(canvas, plate)
  sprite.scale.set(scale.x, scale.y)
  sprite.x = canvas.width / 2
  sprite.y = canvas.height / 2
}
