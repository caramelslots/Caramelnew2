import type { CatalogSymbol } from '../types'

/**
 * Explicit catalog of symbols under ../designer_assets.
 * Add a new folder entry here after dropping assets into designer_assets/<folder>/.
 */
export const SYMBOL_CATALOG: CatalogSymbol[] = [
  {
    id: 'diamond',
    label: 'Diamond',
    folder: 'diamond',
    files: {
      skeleton: 'diamond.json',
      atlas: 'diamond.atlas',
      texture: 'diamond.webp',
      /** Reel static sprite (196×196), separate from Spine atlas texture. */
      staticSprite: 'H1.webp',
    },
  },
]

export function getCatalogSymbol(id: string): CatalogSymbol | undefined {
  return SYMBOL_CATALOG.find((symbol) => symbol.id === id)
}
