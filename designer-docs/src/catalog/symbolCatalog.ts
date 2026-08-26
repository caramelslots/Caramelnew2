import type { CatalogSymbol } from '../types'

/**
 * Optional reference catalog under ../designer_assets.
 * Library and Reel Lab start empty and use only uploaded symbols.
 * Guide preview uses hardcoded H1 paths (see DesignerGuideAccordion).
 */
export const SYMBOL_CATALOG: CatalogSymbol[] = []

export function getCatalogSymbol(id: string): CatalogSymbol | undefined {
  return SYMBOL_CATALOG.find((symbol) => symbol.id === id)
}
