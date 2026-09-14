import type { LibrarySymbol } from '../library/types'
import type { BoardDimensions } from './constants'

export type BoardCell = {
  symbolId: string
  label: string
  staticUrl: string
}

export type BoardGrid = BoardCell[][] // [col][row]

export function readyStaticSymbols(
  library: LibrarySymbol[],
  allowedIds?: Set<string> | null,
): LibrarySymbol[] {
  return library.filter((item) => {
    if (!item.staticSprite?.url) return false
    if (item.status.readiness !== 'ready' && item.status.readiness !== 'partial') {
      return false
    }
    if (allowedIds && !allowedIds.has(item.id)) return false
    return true
  })
}

/** Build [cols][rows] from library statics (cycles if fewer symbols than cells). */
export function fillBoardFromLibrary(
  library: LibrarySymbol[],
  dims: BoardDimensions,
  seed = Date.now(),
  allowedIds?: Set<string> | null,
): BoardGrid | null {
  const pool = readyStaticSymbols(library, allowedIds)
  if (pool.length === 0) return null

  let state = seed >>> 0
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }

  const grid: BoardGrid = []
  for (let col = 0; col < dims.cols; col += 1) {
    const column: BoardCell[] = []
    for (let row = 0; row < dims.rows; row += 1) {
      const pick = pool[Math.floor(rand() * pool.length)]!
      column.push({
        symbolId: pick.id,
        label: pick.label,
        staticUrl: pick.staticSprite!.url,
      })
    }
    grid.push(column)
  }
  return grid
}
