import { useEffect, useRef, useState } from 'react'
import { Application, Container, Texture } from 'pixi.js'
import type { LibrarySymbol } from '../library/types'
import { createStageLayers } from '../stage/buildStage'
import type { StageLayoutKind } from '../stage/deviceFit'
import type { ResolvedStageUrls, StageBackgroundSpinePack } from '../stage/stagePack'
import {
  SYMBOL_SIZE,
  type BoardDimensions,
} from './constants'
import { createCellSpine, createCellStaticSprite, type CellAnimMode } from './cellSpine'
import { fillBoardFromLibrary, type BoardGrid } from './fillBoard'
import { MAX_LIVE_IDLE_SPINES } from './spineBudget'
import { resolveSymbolSizeFit } from './symbolSizeFit'
import {
  clearSpinePool,
  preloadSpineTemplates,
  type SpineTemplate,
} from './spinePool'
import {
  REEL_SPIN_DELAY_MS,
  scrollRowsForColumn,
} from './spinOptions'

/**
 * Literal cat_mafia REEL_SPEED. Absolute elapsed time for strip scroll
 * (not additive ticker — that path can stack on HMR).
 */
const SPIN_SPEED_PX_MS = 1.4

type ReelBoardCanvasProps = {
  library: LibrarySymbol[]
  board: BoardDimensions
  resolutionScale: number
  stageUrls: ResolvedStageUrls
  /** Optional Spine street — when set, replaces the static background sprite. */
  backgroundSpine?: StageBackgroundSpinePack | null
  /** When set, only these symbol ids are used to fill the board. Empty = all ready. */
  allowedSymbolIds: string[] | null
  spinNonce: number
  /** Bumps to play win on current settled grid. */
  winNonce: number
  /** Bumps to reshuffle settled board without spin. */
  refillNonce: number
  useSpineAfterStop: boolean
  /** Street + desk environment (Phase 3). */
  showEnvironment?: boolean
  /** Device layout kind for board placement (Phase 4). */
  layoutKind?: StageLayoutKind
  onSpinningChange: (spinning: boolean) => void
  onGridChange: (grid: BoardGrid | null) => void
  onError: (message: string | null) => void
}

function safeDestroy(app: Application | null) {
  if (!app) return
  try {
    if (app.renderer && app.stage) app.destroy(true)
  } catch {
    // ignore
  }
}

function clearPlayfield(playfield: Container): void {
  for (let i = playfield.children.length - 1; i >= 1; i -= 1) {
    const child = playfield.children[i]!
    child.destroy({ children: true })
  }
}

async function loadTexture(url: string, cache: Map<string, Texture>): Promise<Texture> {
  const cached = cache.get(url)
  if (cached) return cached
  const texture = await textureFromAnyUrl(url)
  cache.set(url, texture)
  return texture
}

async function textureFromAnyUrl(url: string): Promise<Texture> {
  const img = new Image()
  img.decoding = 'async'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Cannot load ${url.slice(0, 64)}`))
    img.src = url
  })
  return Texture.from(img)
}

export function ReelBoardCanvas({
  library,
  board,
  resolutionScale,
  stageUrls,
  backgroundSpine = null,
  allowedSymbolIds,
  spinNonce,
  winNonce,
  refillNonce,
  useSpineAfterStop,
  showEnvironment = true,
  layoutKind = 'desktop',
  onSpinningChange,
  onGridChange,
  onError,
}: ReelBoardCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const playfieldRef = useRef<Container | null>(null)
  const layoutKindRef = useRef(layoutKind)
  layoutKindRef.current = layoutKind
  const stageUrlsRef = useRef(stageUrls)
  stageUrlsRef.current = stageUrls
  const backgroundSpineRef = useRef(backgroundSpine)
  backgroundSpineRef.current = backgroundSpine
  const cacheRef = useRef(new Map<string, Texture>())
  const templatesRef = useRef(new Map<string, SpineTemplate>())
  const gridRef = useRef<BoardGrid | null>(null)
  const libraryRef = useRef(library)
  libraryRef.current = library
  const allowedRef = useRef(allowedSymbolIds)
  allowedRef.current = allowedSymbolIds
  const useSpineRef = useRef(useSpineAfterStop)
  useSpineRef.current = useSpineAfterStop
  const spinningRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const stageDisposeRef = useRef<(() => void) | null>(null)
  const onSpinningChangeRef = useRef(onSpinningChange)
  const onGridChangeRef = useRef(onGridChange)
  const onErrorRef = useRef(onError)
  onSpinningChangeRef.current = onSpinningChange
  onGridChangeRef.current = onGridChange
  onErrorRef.current = onError
  const [bootId, setBootId] = useState(0)

  const stageKey = [
    stageUrls.background,
    stageUrls.deskBase,
    stageUrls.deskContour,
    backgroundSpine?.skeletonUrl ?? '',
    backgroundSpine?.atlasUrl ?? '',
    backgroundSpine ? Object.keys(backgroundSpine.pageUrls).sort().join('|') : '',
  ].join('::')

  const allowedSet = () => {
    const ids = allowedRef.current
    if (ids === null) return null
    return new Set(ids)
  }

  const paintSettled = async (grid: BoardGrid, mode: CellAnimMode) => {
    const playfield = playfieldRef.current
    if (!playfield) return
    clearPlayfield(playfield)

    const wantSpine = useSpineRef.current
    const totalCells = grid.reduce((sum, col) => sum + col.length, 0)
    let liveIdle = 0

    for (let col = 0; col < grid.length; col += 1) {
      for (let row = 0; row < grid[col]!.length; row += 1) {
        const cell = grid[col]![row]!
        const template = wantSpine ? templatesRef.current.get(cell.symbolId) : undefined

        if (!template) {
          const texture = await loadTexture(cell.staticUrl, cacheRef.current)
          const fit = resolveSymbolSizeFit(cell.label)
          playfield.addChild(createCellStaticSprite(texture, col, row, fit.offsetY))
          continue
        }

        // cat_mafia: static/idle = Spine `idle`; win = Spine win/activation.
        // Budget only freezes ticker (autoUpdate=false) — still shows idle pose,
        // never swaps last columns to WebP (that caused “missing idle”).
        if (mode === 'idle') {
          const live =
            totalCells <= MAX_LIVE_IDLE_SPINES || liveIdle < MAX_LIVE_IDLE_SPINES
          if (live) liveIdle += 1
          playfield.addChild(
            createCellSpine(template, col, row, 'idle', { autoUpdate: live }).holder,
          )
          continue
        }

        playfield.addChild(createCellSpine(template, col, row, mode).holder)
      }
    }
  }

  /**
   * Land one column like cat_mafia:
   * spin WebP strip removed → Spine `stop` → queue Spine `idle` on same instance.
   * No WebP swap after land (that was the flicker).
   */
  const paintColumnLand = async (grid: BoardGrid, colIndex: number) => {
    const playfield = playfieldRef.current
    if (!playfield) return
    const column = grid[colIndex]
    if (!column) return

    const wantSpine = useSpineRef.current
    for (let row = 0; row < column.length; row += 1) {
      const cell = column[row]!
      const template = wantSpine ? templatesRef.current.get(cell.symbolId) : undefined
      if (template) {
        playfield.addChild(
          createCellSpine(template, colIndex, row, 'land', {
            animateIdleAfterLand: true,
            autoUpdate: true,
          }).holder,
        )
        continue
      }
      const texture = await loadTexture(cell.staticUrl, cacheRef.current)
      const fit = resolveSymbolSizeFit(cell.label)
      playfield.addChild(createCellStaticSprite(texture, colIndex, row, fit.offsetY))
    }
  }

  // Boot Pixi + stage environment (bg + desk)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false

    const boot = async () => {
      try {
        const app = new Application()
        await app.init({
          background: '#1a2433',
          antialias: true,
          resolution: Math.min((window.devicePixelRatio || 1) * resolutionScale, 3),
          autoDensity: true,
          resizeTo: host,
          preference: 'webgl',
        })
        if (cancelled) {
          safeDestroy(app)
          return
        }

        appRef.current = app
        host.replaceChildren(app.canvas)

        if (showEnvironment) {
          const layers = await createStageLayers(
            board,
            () => ({
              width: app.screen.width,
              height: app.screen.height,
            }),
            () => layoutKindRef.current,
            stageUrlsRef.current,
            backgroundSpineRef.current,
          )
          if (cancelled) {
            layers.dispose()
            safeDestroy(app)
            return
          }
          app.stage.addChild(layers.backgroundRoot)
          app.stage.addChild(layers.contentRoot)
          playfieldRef.current = layers.playfield
          layers.layout()
          app.renderer.on('resize', layers.layout)
          stageDisposeRef.current = layers.dispose
        } else {
          const { Graphics } = await import('pixi.js')
          const { boardPixelSize } = await import('./constants')
          const size = boardPixelSize(board)
          const world = new Container()
          const frame = new Graphics()
          frame.roundRect(-10, -10, size.width + 20, size.height + 20, 12)
          frame.stroke({ width: 3, color: 0xc9a227, alpha: 0.9 })
          frame.roundRect(0, 0, size.width, size.height, 6)
          frame.fill({ color: 0x182030, alpha: 0.95 })
          const playfield = new Container()
          const mask = new Graphics()
          mask.rect(0, 0, size.width, size.height)
          mask.fill(0xffffff)
          playfield.mask = mask
          playfield.addChild(mask)
          world.addChild(frame)
          world.addChild(playfield)
          app.stage.addChild(world)
          playfieldRef.current = playfield
          const layout = () => {
            const scale =
              Math.min(app.screen.width / size.width, app.screen.height / size.height) * 0.88
            world.scale.set(scale)
            world.x = (app.screen.width - size.width * scale) / 2
            world.y = (app.screen.height - size.height * scale) / 2
          }
          layout()
          app.renderer.on('resize', layout)
        }

        setBootId((value) => value + 1)
        onErrorRef.current(null)
      } catch (err) {
        if (!cancelled) {
          onErrorRef.current(err instanceof Error ? err.message : 'Reel stage failed')
        }
      }
    }

    void boot()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      stageDisposeRef.current?.()
      stageDisposeRef.current = null
      clearSpinePool()
      templatesRef.current.clear()
      safeDestroy(appRef.current)
      appRef.current = null
      playfieldRef.current = null
      host.replaceChildren()
    }
  }, [board.cols, board.rows, resolutionScale, showEnvironment, layoutKind, stageKey])

  // Preload spines + paint idle board
  useEffect(() => {
    if (!bootId || spinningRef.current) return
    let cancelled = false

    const run = async () => {
      try {
        const map = await preloadSpineTemplates(libraryRef.current)
        if (cancelled) return
        templatesRef.current = map

        const grid = fillBoardFromLibrary(
          libraryRef.current,
          board,
          Date.now(),
          allowedSet(),
        )
        if (!grid) {
          onGridChangeRef.current(null)
          onErrorRef.current('Добавьте в Library символы со static WebP.')
          return
        }
        gridRef.current = grid
        await paintSettled(grid, 'idle')
        if (cancelled) return
        onGridChangeRef.current(grid)
        onErrorRef.current(null)
      } catch (err) {
        if (!cancelled) {
          onErrorRef.current(err instanceof Error ? err.message : 'Board paint failed')
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [bootId, board, library, allowedSymbolIds, useSpineAfterStop, refillNonce])

  // Spin — static strips scroll DOWN; each column lands with Spine stop→idle (cat_mafia)
  useEffect(() => {
    if (spinNonce === 0) return
    const playfield = playfieldRef.current
    if (!playfield) return

    let cancelled = false
    let settleSpin: (() => void) | null = null
    const { cols, rows } = board

    const clearSpinning = () => {
      spinningRef.current = false
      onSpinningChangeRef.current(false)
    }

    const run = async () => {
      let ownsSpinFlag = false
      try {
        templatesRef.current = await preloadSpineTemplates(libraryRef.current)
        if (cancelled) return

        const finalGrid = fillBoardFromLibrary(
          libraryRef.current,
          board,
          spinNonce * 997,
          allowedSet(),
        )
        if (!finalGrid) {
          onErrorRef.current('Нет static-символов для спина.')
          return
        }

        // Prefetch every static used on this spin so column build doesn't stall mid-loop.
        const urls = new Set<string>()
        for (const col of finalGrid) {
          for (const cell of col) urls.add(cell.staticUrl)
        }
        await Promise.all([...urls].map((url) => loadTexture(url, cacheRef.current)))
        if (cancelled) return

        spinningRef.current = true
        onSpinningChangeRef.current(true)
        ownsSpinFlag = true
        clearPlayfield(playfield)

        type ColState = {
          colIndex: number
          container: Container
          startY: number
          targetY: number
          done: boolean
          landed: boolean
          launchAt: number
        }

        const columns: ColState[] = []

        for (let col = 0; col < cols; col += 1) {
          if (cancelled) return
          const travelRows = scrollRowsForColumn(rows, col)
          const stripLen = Math.ceil(travelRows) + rows
          const stripPool =
            fillBoardFromLibrary(
              libraryRef.current,
              { cols: 1, rows: stripLen },
              spinNonce + col * 17,
              allowedSet(),
            )?.[0] ?? []
          if (stripPool.length === 0) continue

          const container = new Container()
          container.x = col * SYMBOL_SIZE
          const strip = [...stripPool]
          for (let row = 0; row < rows; row += 1) {
            strip[row] = finalGrid[col]![row]!
          }

          for (let i = 0; i < strip.length; i += 1) {
            const cell = strip[i]!
            const texture = await loadTexture(cell.staticUrl, cacheRef.current)
            if (cancelled) return
            const fit = resolveSymbolSizeFit(cell.label)
            // col=0 → x at half-cell; row=i → stride SYMBOL_SIZE (not glyph).
            const sprite = createCellStaticSprite(texture, 0, i, fit.offsetY)
            container.addChild(sprite)
          }

          // Match cat_mafia distance topY→defaultY = (reelLength+padding)×SYMBOL_SIZE.
          // Lab parks at y=0 (symbols laid out from row 0); game parks at defaultY=-SYMBOL_SIZE.
          const targetY = 0
          const startY = -travelRows * SYMBOL_SIZE
          container.y = startY
          playfield.addChild(container)
          columns.push({
            colIndex: col,
            container,
            startY,
            targetY,
            done: false,
            landed: false,
            launchAt: 0,
          })
        }

        if (columns.length === 0) {
          onErrorRef.current('Не удалось собрать колонки для спина.')
          return
        }

        const spinSpeed = SPIN_SPEED_PX_MS
        const spinStart = performance.now()
        for (const col of columns) {
          col.launchAt = spinStart + col.colIndex * REEL_SPIN_DELAY_MS
        }

        await new Promise<void>((resolve) => {
          let pendingLands = 0
          let settled = false
          let rafId = 0

          const settle = () => {
            if (settled) return
            settled = true
            cancelAnimationFrame(rafId)
            settleSpin = null
            resolve()
          }
          settleSpin = settle

          const tryFinish = () => {
            if (cancelled) {
              settle()
              return
            }
            if (pendingLands > 0) return
            if (!columns.every((col) => col.done && col.landed)) return
            gridRef.current = finalGrid
            onGridChangeRef.current(finalGrid)
            settle()
          }

          const landColumn = (col: ColState) => {
            if (col.landed) return
            col.landed = true
            if (cancelled) {
              tryFinish()
              return
            }
            playfield.removeChild(col.container)
            col.container.destroy({ children: true })
            pendingLands += 1
            void paintColumnLand(finalGrid, col.colIndex)
              .catch((err) => {
                onErrorRef.current(err instanceof Error ? err.message : 'Land failed')
              })
              .finally(() => {
                pendingLands -= 1
                tryFinish()
              })
          }

          const onFrame = () => {
            if (cancelled) {
              settle()
              return
            }
            const now = performance.now()
            let allScrollingDone = true

            for (const col of columns) {
              if (col.done) continue
              if (now < col.launchAt) {
                allScrollingDone = false
                continue
              }

              allScrollingDone = false
              const distance = col.targetY - col.startY
              const y = col.startY + Math.min(distance, spinSpeed * (now - col.launchAt))
              col.container.y = y
              if (y >= col.targetY - 0.5) {
                col.container.y = col.targetY
                col.done = true
                landColumn(col)
              }
            }

            if (allScrollingDone) {
              tryFinish()
              return
            }
            rafId = requestAnimationFrame(onFrame)
          }

          rafId = requestAnimationFrame(onFrame)
        })
      } catch (err) {
        onErrorRef.current(err instanceof Error ? err.message : 'Spin failed')
      } finally {
        settleSpin?.()
        settleSpin = null
        if (ownsSpinFlag) {
          clearSpinning()
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      settleSpin?.()
      settleSpin = null
      clearSpinning()
    }
  }, [spinNonce, board.cols, board.rows])

  // Win demo on settled grid
  useEffect(() => {
    if (winNonce === 0 || spinningRef.current) return
    const grid = gridRef.current
    if (!grid) return
    void paintSettled(grid, 'win').catch((err) =>
      onErrorRef.current(err instanceof Error ? err.message : 'Win demo failed'),
    )
  }, [winNonce])

  return <div className="reel-board-host" ref={hostRef} />
}
