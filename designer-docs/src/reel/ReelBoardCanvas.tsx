import { useEffect, useRef, useState } from 'react'
import { Application, Container, Texture } from 'pixi.js'
import type { LibrarySymbol } from '../library/types'
import { createStageLayers } from '../stage/buildStage'
import type { StageLayoutKind } from '../stage/deviceFit'
import type { ResolvedStageUrls, StageBackgroundSpinePack } from '../stage/stagePack'
import {
  SYMBOL_SIZE,
  getSymbolX,
  getSymbolY,
  type BoardDimensions,
} from './constants'
import { createCellSpine, createCellStaticSprite, createStripStaticSprite, type CellAnimMode } from './cellSpine'
import { fillBoardFromLibrary, type BoardCell, type BoardGrid } from './fillBoard'
import { MAX_LIVE_IDLE_SPINES } from './spineBudget'
import { resolveSymbolSizeFit } from './symbolSizeFit'
import {
  clearSpinePool,
  preloadSpineTemplates,
  type SpineTemplate,
} from './spinePool'
import {
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
  /** Visible cell display objects [col][row] — reparented into strips on spin (no texture pop). */
  const cellNodesRef = useRef<(Container | null)[][]>([])
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
    const nodes: (Container | null)[][] = []

    for (let col = 0; col < grid.length; col += 1) {
      const colNodes: (Container | null)[] = []
      for (let row = 0; row < grid[col]!.length; row += 1) {
        const cell = grid[col]![row]!
        const template = wantSpine ? templatesRef.current.get(cell.symbolId) : undefined

        if (!template) {
          const texture = await loadTexture(cell.staticUrl, cacheRef.current)
          const fit = resolveSymbolSizeFit(cell.label)
          const sprite = createCellStaticSprite(texture, col, row, fit.offsetY)
          playfield.addChild(sprite)
          colNodes.push(sprite)
          continue
        }

        // cat_mafia: static/idle = Spine `idle`; win = Spine win/activation.
        if (mode === 'idle') {
          const live =
            totalCells <= MAX_LIVE_IDLE_SPINES || liveIdle < MAX_LIVE_IDLE_SPINES
          if (live) liveIdle += 1
          const { holder } = createCellSpine(template, col, row, 'idle', {
            autoUpdate: live,
          })
          playfield.addChild(holder)
          colNodes.push(holder)
          continue
        }

        const { holder } = createCellSpine(template, col, row, mode)
        playfield.addChild(holder)
        colNodes.push(holder)
      }
      nodes.push(colNodes)
    }
    cellNodesRef.current = nodes
  }

  /**
   * Land one column — sync hard cut like cat_mafia.
   * Also refreshes cellNodesRef for that column so the next spin can reparent.
   */
  const landColumnSync = (grid: BoardGrid, colIndex: number) => {
    const playfield = playfieldRef.current
    if (!playfield) return
    const column = grid[colIndex]
    if (!column) return

    const wantSpine = useSpineRef.current
    const holders: Container[] = []
    const colNodes: (Container | null)[] = []

    for (let row = 0; row < column.length; row += 1) {
      const cell = column[row]!
      const template = wantSpine ? templatesRef.current.get(cell.symbolId) : undefined
      if (template) {
        const { holder } = createCellSpine(template, colIndex, row, 'land', {
          animateIdleAfterLand: true,
          autoUpdate: true,
        })
        holders.push(holder)
        colNodes.push(holder)
        continue
      }
      const texture = cacheRef.current.get(cell.staticUrl)
      if (texture) {
        const fit = resolveSymbolSizeFit(cell.label)
        const sprite = createCellStaticSprite(texture, colIndex, row, fit.offsetY)
        holders.push(sprite)
        colNodes.push(sprite)
      } else {
        colNodes.push(null)
      }
    }

    for (const holder of holders) playfield.addChild(holder)
    if (!cellNodesRef.current[colIndex]) cellNodesRef.current[colIndex] = []
    cellNodesRef.current[colIndex] = colNodes
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

  // Spin — cat_mafia-style:
  // • Reparent current cell nodes into strips (no Spine→WebP pop at click)
  // • All columns start moving on the same frame
  // • Stop stagger = different travel distance per column (padding), not start delay
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

        const currentGrid = gridRef.current ?? finalGrid

        type ColPlan = {
          colIndex: number
          travelInt: number
          stripLen: number
          filler: BoardCell[]
        }

        const plans: ColPlan[] = []
        const urls = new Set<string>()

        for (const col of finalGrid) {
          for (const cell of col) urls.add(cell.staticUrl)
        }
        for (const col of currentGrid) {
          for (const cell of col) urls.add(cell.staticUrl)
        }

        for (let col = 0; col < cols; col += 1) {
          const travelRows = scrollRowsForColumn(rows, col)
          const travelInt = Math.max(rows, Math.ceil(travelRows))
          const stripLen = travelInt + rows
          const filler =
            fillBoardFromLibrary(
              libraryRef.current,
              { cols: 1, rows: stripLen },
              spinNonce + col * 17,
              allowedSet(),
            )?.[0] ?? []
          if (filler.length === 0) continue
          for (const cell of filler) urls.add(cell.staticUrl)
          plans.push({ colIndex: col, travelInt, stripLen, filler })
        }

        await Promise.all([...urls].map((url) => loadTexture(url, cacheRef.current)))
        if (cancelled) return

        if (plans.length === 0) {
          onErrorRef.current('Не удалось собрать колонки для спина.')
          return
        }

        type ColState = {
          colIndex: number
          container: Container
          startY: number
          targetY: number
          done: boolean
          landed: boolean
        }

        // ONE sync frame: reparent current nodes → strips → mount → scroll.
        // No awaits here — otherwise symbols vanish while other columns load.
        const columns: ColState[] = []
        for (const plan of plans) {
          const { colIndex: col, travelInt, stripLen, filler } = plan
          const container = new Container()
          container.x = getSymbolX(col) - SYMBOL_SIZE * 0.5

          for (let i = 0; i < stripLen; i += 1) {
            if (i >= travelInt && i < travelInt + rows) continue
            const cell =
              i < rows
                ? finalGrid[col]![i]!
                : (filler[i] ?? filler[i % Math.max(filler.length, 1)]!)
            if (!cell) continue
            const texture = cacheRef.current.get(cell.staticUrl)
            if (!texture) continue
            container.addChild(createStripStaticSprite(texture, i))
          }

          const colNodes = cellNodesRef.current[col] ?? []
          for (let row = 0; row < rows; row += 1) {
            const node = colNodes[row]
            if (!node || node.destroyed) {
              const cell = currentGrid[col]![row]!
              const texture = cacheRef.current.get(cell.staticUrl)
              if (!texture) continue
              const fit = resolveSymbolSizeFit(cell.label)
              const sprite = createStripStaticSprite(texture, travelInt + row)
              sprite.y += fit.offsetY
              container.addChild(sprite)
              continue
            }
            if (node.parent) node.parent.removeChild(node)
            const prevOffset = node.y - getSymbolY(row)
            node.x = SYMBOL_SIZE * 0.5
            node.y =
              (travelInt + row + 0.5) * SYMBOL_SIZE +
              (Number.isFinite(prevOffset) ? prevOffset : 0)
            container.addChild(node)
          }
          cellNodesRef.current[col] = []

          const startY = -travelInt * SYMBOL_SIZE
          container.y = startY
          columns.push({
            colIndex: col,
            container,
            startY,
            targetY: 0,
            done: false,
            landed: false,
          })
        }

        spinningRef.current = true
        onSpinningChangeRef.current(true)
        ownsSpinFlag = true

        // Leftover idle nodes (if any) — destroy; strips already hold reparented ones.
        clearPlayfield(playfield)
        for (const col of columns) playfield.addChild(col.container)

        // All columns launch together. Stop order = different travel distances.
        const spinSpeed = SPIN_SPEED_PX_MS
        const spinStart = performance.now()

        await new Promise<void>((resolve) => {
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

          const landColumn = (col: ColState) => {
            if (col.landed) return
            col.landed = true
            if (cancelled) return

            landColumnSync(finalGrid, col.colIndex)
            playfield.removeChild(col.container)
            col.container.destroy({ children: true })
          }

          const onFrame = () => {
            if (cancelled) {
              settle()
              return
            }
            const elapsed = performance.now() - spinStart
            let allDone = true

            for (const col of columns) {
              if (col.done) continue
              allDone = false
              const distance = col.targetY - col.startY
              const y = col.startY + Math.min(distance, spinSpeed * elapsed)
              col.container.y = y
              if (y >= col.targetY - 0.5) {
                col.container.y = col.targetY
                col.done = true
                landColumn(col)
              }
            }

            if (allDone && columns.every((col) => col.landed)) {
              gridRef.current = finalGrid
              onGridChangeRef.current(finalGrid)
              settle()
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
    cellNodesRef.current = []
    void paintSettled(grid, 'win').catch((err) =>
      onErrorRef.current(err instanceof Error ? err.message : 'Win demo failed'),
    )
  }, [winNonce])

  return <div className="reel-board-host" ref={hostRef} />
}
