import type { LibrarySymbol } from '../library/types'
import type { BoardDimensions } from './constants'

export type BoardCell = {
  symbolId: string
  label: string
  staticUrl: string
}

export type BoardGrid = BoardCell[][] // [col][row]

export function readyStaticSymbols(library: LibrarySymbol[]): LibrarySymbol[] {
  return library.filter(
    (item) => item.staticSprite?.url && (item.status.readiness === 'ready' || item.status.readiness === 'partial'),
  )
}

/** Build [cols][rows] from library statics (cycles if fewer symbols than cells). */
export function fillBoardFromLibrary(
  library: LibrarySymbol[],
  dims: BoardDimensions,
  seed = Date.now(),
): BoardGrid | null {
  const pool = readyStaticSymbols(library)
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

/** Extra strip symbols above/below for spin runway (same pool). */
export function buildSpinStrip(
  library: LibrarySymbol[],
  visibleRows: number,
  pad: number,
  seed: number,
): BoardCell[] {
  const pool = readyStaticSymbols(library)
  if (pool.length === 0) return []

  let state = seed >>> 0
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }

  const length = visibleRows + pad * 2
  const strip: BoardCell[] = []
  for (let i = 0; i < length; i += 1) {
    const pick = pool[Math.floor(rand() * pool.length)]!
    strip.push({
      symbolId: pick.id,
      label: pick.label,
      staticUrl: pick.staticSprite!.url,
    })
  }
  return strip
}
