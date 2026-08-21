import type { CatalogSymbol, SpineAssetSource } from '../types'
import { getCatalogSymbol } from './symbolCatalog'

const ASSET_BASE = '/designer-assets'

export function catalogUrls(symbol: CatalogSymbol): {
  skeletonUrl: string
  atlasUrl: string
  textureUrl: string
} {
  const base = `${ASSET_BASE}/${symbol.folder}`
  return {
    skeletonUrl: `${base}/${symbol.files.skeleton}`,
    atlasUrl: `${base}/${symbol.files.atlas}`,
    textureUrl: `${base}/${symbol.files.texture}`,
  }
}

export function catalogSourceFromId(symbolId: string): SpineAssetSource | null {
  const symbol = getCatalogSymbol(symbolId)
  if (!symbol) return null
  const urls = catalogUrls(symbol)
  return {
    kind: 'catalog',
    symbolId: symbol.id,
    skeletonUrl: urls.skeletonUrl,
    atlasUrl: urls.atlasUrl,
    textureUrl: urls.textureUrl,
    textureFileName: symbol.files.texture,
  }
}
