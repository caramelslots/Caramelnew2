import type { Spine, TextureAtlas } from '@esotericsoftware/spine-pixi-v8'
import type { SpineMetrics } from '../types'

function countTimelineKeys(spine: Spine, animationName: string | null): number {
  if (!animationName) return 0
  const animation = spine.skeleton.data.findAnimation(animationName)
  if (!animation) return 0

  let keys = 0
  for (const timeline of animation.timelines) {
    const withCount = timeline as { getFrameCount?: () => number; getFrameEntries?: () => number }
    if (typeof withCount.getFrameCount === 'function') {
      keys += withCount.getFrameCount()
      continue
    }
    if (typeof withCount.getFrameEntries === 'function') {
      keys += Math.max(1, Math.floor(withCount.getFrameEntries() / 2))
    }
  }
  return keys
}

function countAttachments(spine: Spine): number {
  let total = 0
  for (const skin of spine.skeleton.data.skins) {
    total += skin.getAttachments().length
  }
  return total
}

function textureFormatFromUrl(url: string): string {
  const clean = url.split('?')[0]?.toLowerCase() ?? ''
  if (clean.endsWith('.webp')) return 'webp'
  if (clean.endsWith('.png')) return 'png'
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'jpeg'
  if (clean.startsWith('blob:')) return 'upload'
  return 'unknown'
}

function readAtlasStats(atlas: TextureAtlas | null): {
  regionCount: number
  textureWidth: number
  textureHeight: number
} {
  if (!atlas) {
    return { regionCount: 0, textureWidth: 0, textureHeight: 0 }
  }

  const page = atlas.pages[0]
  return {
    regionCount: atlas.regions.length,
    textureWidth: page?.width ?? 0,
    textureHeight: page?.height ?? 0,
  }
}

export function collectSpineMetrics(
  spine: Spine,
  animationName: string | null,
  textureUrl: string,
  atlas: TextureAtlas | null,
): SpineMetrics {
  const animation = animationName ? spine.skeleton.data.findAnimation(animationName) : null
  const durationSec = animation?.duration ?? 0
  const framesAt30 = Math.round(durationSec * 30 * 10) / 10
  const framesAt60 = Math.round(durationSec * 60 * 10) / 10
  const atlasStats = readAtlasStats(atlas)

  const textureApproxBytes = atlasStats.textureWidth * atlasStats.textureHeight * 4
  const warnings: string[] = []

  if (framesAt30 > 90) {
    warnings.push(`Long clip at 30fps (~${framesAt30} frames). Prefer shorter win/bounce.`)
  }
  if (atlasStats.textureWidth > 2048 || atlasStats.textureHeight > 2048) {
    warnings.push(
      `Texture ${atlasStats.textureWidth}×${atlasStats.textureHeight} exceeds 2048² guideline.`,
    )
  }
  if (atlasStats.textureWidth >= 2048 && atlasStats.textureHeight >= 2048) {
    warnings.push('Full 2048² atlas — check unused padding and region packing.')
  }

  return {
    animationName,
    durationSec,
    framesAt30,
    framesAt60,
    timelineKeys: countTimelineKeys(spine, animationName),
    boneCount: spine.skeleton.data.bones.length,
    slotCount: spine.skeleton.data.slots.length,
    attachmentCount: countAttachments(spine),
    atlasRegionCount: atlasStats.regionCount,
    textureWidth: atlasStats.textureWidth,
    textureHeight: atlasStats.textureHeight,
    textureApproxBytes,
    textureFormat: textureFormatFromUrl(textureUrl),
    warnings,
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
