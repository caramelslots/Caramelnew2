import { Texture } from 'pixi.js'
import {
  AtlasAttachmentLoader,
  SkeletonJson,
  Spine,
  SpineTexture,
  TextureAtlas,
} from '@esotericsoftware/spine-pixi-v8'
import type { SpineAssetSource } from '../types'

export type LoadedSpineBundle = {
  spine: Spine
  atlas: TextureAtlas
  texture: Texture
  dispose: () => void
}

async function readText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`)
  }
  return response.text()
}

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`)
  }
  return response.json()
}

/**
 * Load texture outside Pixi Assets cache so remount/dispose cannot
 * null out a shared Texture.source while another load is in flight.
 */
/** Fetch + decode raster for Spine (works with blob: ObjectURLs). */
export async function loadPixiTextureFromUrl(url: string): Promise<Texture> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch texture ${url} (${response.status})`)
  }

  const blob = await response.blob()
  if (blob.size === 0) {
    throw new Error(`Texture at ${url} is empty`)
  }

  try {
    const bitmap = await createImageBitmap(blob)
    const texture = Texture.from(bitmap)
    if (!texture?.source) {
      bitmap.close()
      throw new Error('Pixi Texture.from(ImageBitmap) returned no source')
    }
    return texture
  } catch (bitmapError) {
    // Fallback for environments where createImageBitmap fails on webp.
    const objectUrl = URL.createObjectURL(blob)
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error(`Image failed to decode ${url}`))
        img.src = objectUrl
      })
      const texture = Texture.from(image)
      if (!texture?.source) {
        throw new Error('Pixi Texture.from(Image) returned no source')
      }
      return texture
    } catch (imageError) {
      const reason =
        imageError instanceof Error
          ? imageError.message
          : bitmapError instanceof Error
            ? bitmapError.message
            : 'unknown texture error'
      throw new Error(`Failed to create texture for ${url}: ${reason}`)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }
}

/**
 * Load catalog or upload Spine pack into a disposable Spine instance.
 * Uses manual atlas + skeleton parsing so blob: ObjectURLs work without file extensions.
 */
export async function loadSpineFromSource(source: SpineAssetSource): Promise<LoadedSpineBundle> {
  const [atlasText, skeletonJson, texture] = await Promise.all([
    readText(source.atlasUrl),
    readJson(source.skeletonUrl),
    loadPixiTextureFromUrl(source.textureUrl),
  ])

  const atlas = new TextureAtlas(atlasText)
  const spineTexture = SpineTexture.from(texture.source)
  for (const page of atlas.pages) {
    page.setTexture(spineTexture)
  }

  const attachmentLoader = new AtlasAttachmentLoader(atlas)
  const parser = new SkeletonJson(attachmentLoader)
  parser.scale = 1
  const skeletonData = parser.readSkeletonData(skeletonJson)
  // autoUpdate setter stacks Ticker listeners on every `= true` — enable once only.
  const spine = new Spine({ skeletonData, autoUpdate: false })
  spine.autoUpdate = true

  let disposed = false

  return {
    spine,
    atlas,
    texture,
    dispose: () => {
      if (disposed) return
      disposed = true
      try {
        spine.destroy({ children: true })
      } catch {
        // ignore
      }
      try {
        atlas.dispose()
      } catch {
        // ignore
      }
      try {
        texture.destroy(true)
      } catch {
        // ignore
      }
    },
  }
}

export function listAnimationNames(spine: Spine): string[] {
  return spine.skeleton.data.animations.map((animation) => animation.name)
}
