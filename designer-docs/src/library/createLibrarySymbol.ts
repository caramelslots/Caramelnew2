import { catalogUrls } from '../catalog/assetPaths'
import { SYMBOL_CATALOG } from '../catalog/symbolCatalog'
import { STATIC_SPRITE_SPEC } from '../catalog/symbolSpecs'
import {
  computeLibraryStatus,
  type LibrarySymbol,
  type StaticSpriteInfo,
} from './types'
import type { ValidatedUpload } from '../components/upload/UploadValidation'
import type { SpineAssetSource } from '../types'

export function librarySymbolToSpineSource(
  symbol: LibrarySymbol,
): SpineAssetSource | null {
  if (!symbol.status.spineOk) return null
  if (symbol.kind === 'catalog') {
    return {
      kind: 'catalog',
      symbolId: symbol.id,
      skeletonUrl: symbol.spine.skeletonUrl,
      atlasUrl: symbol.spine.atlasUrl,
      textureUrl: symbol.spine.textureUrl,
      textureFileName: symbol.spine.textureFileName,
    }
  }
  return {
    kind: 'upload',
    id: symbol.id,
    label: symbol.label,
    skeletonUrl: symbol.spine.skeletonUrl,
    atlasUrl: symbol.spine.atlasUrl,
    textureUrl: symbol.spine.textureUrl,
    textureFileName: symbol.spine.textureFileName,
    atlasTextureName: symbol.spine.atlasTextureName ?? symbol.spine.textureFileName,
  }
}

export function createLibrarySymbolFromUpload(
  payload: ValidatedUpload,
  id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
): LibrarySymbol {
  const staticSprite = payload.staticSprite
  const status = computeLibraryStatus({
    hasSpine: true,
    staticSprite,
  })

  return {
    id,
    label: payload.label,
    kind: 'upload',
    spine: {
      skeletonUrl: payload.skeletonUrl,
      atlasUrl: payload.atlasUrl,
      textureUrl: payload.textureUrl,
      textureFileName: payload.textureFileName,
      atlasTextureName: payload.atlasTextureName,
    },
    staticSprite,
    roles: null,
    animationNames: [],
    status,
    thumbUrl: staticSprite?.url ?? null,
    revoke: payload.revoke,
  }
}

export function createCatalogLibrarySymbols(): LibrarySymbol[] {
  return SYMBOL_CATALOG.map((entry) => {
    const urls = catalogUrls(entry)
    const staticSprite: StaticSpriteInfo | null = urls.staticSpriteUrl
      ? {
          url: urls.staticSpriteUrl,
          fileName: entry.files.staticSprite ?? 'static.webp',
          width: STATIC_SPRITE_SPEC.width,
          height: STATIC_SPRITE_SPEC.height,
          format: STATIC_SPRITE_SPEC.format,
          approxBytes: 0,
        }
      : null

    const status = computeLibraryStatus({
      hasSpine: true,
      staticSprite,
    })

    return {
      id: entry.id,
      label: entry.label,
      kind: 'catalog' as const,
      spine: {
        skeletonUrl: urls.skeletonUrl,
        atlasUrl: urls.atlasUrl,
        textureUrl: urls.textureUrl,
        textureFileName: entry.files.texture,
      },
      staticSprite,
      roles: null,
      animationNames: [],
      status,
      thumbUrl: staticSprite?.url ?? null,
      revoke: () => undefined,
    }
  })
}
