import { useEffect, useRef, useState } from 'react'
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js'
import type { LibrarySymbol } from '../library/types'
import {
  CELL_SYMBOL_SIZE,
  SYMBOL_SIZE,
  boardPixelSize,
  type BoardDimensions,
} from './constants'
import { fillBoardFromLibrary, type BoardGrid } from './fillBoard'

type ReelBoardCanvasProps = {
  library: LibrarySymbol[]
  board: BoardDimensions
  resolutionScale: number
  spinNonce: number
  onSpinningChange: (spinning: boolean) => void
  onGridChange: (grid: BoardGrid | null) => void
  onError: (message: string | null) => void
}

const PAD = 3
const SPEED = 32
const MIN_SPIN_MS = 800
const STAGGER_MS = 140

function safeDestroy(app: Application | null) {
  if (!app) return
  try {
    if (app.renderer && app.stage) app.destroy(true)
  } catch {
    // ignore teardown races
  }
}

async function loadTexture(url: string, cache: Map<string, Texture>): Promise<Texture> {
  const cached = cache.get(url)
  if (cached) return cached
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Cannot load ${url}`)
  const blob = await res.blob()
  const bitmap = await createImageBitmap(blob)
  const texture = Texture.from(bitmap)
  cache.set(url, texture)
  return texture
}

export function ReelBoardCanvas({
  library,
  board,
  resolutionScale,
  spinNonce,
  onSpinningChange,
  onGridChange,
  onError,
}: ReelBoardCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const playfieldRef = useRef<Container | null>(null)
  const cacheRef = useRef(new Map<string, Texture>())
  const libraryRef = useRef(library)
  libraryRef.current = library
  const spinningRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const onSpinningChangeRef = useRef(onSpinningChange)
  const onGridChangeRef = useRef(onGridChange)
  const onErrorRef = useRef(onError)
  onSpinningChangeRef.current = onSpinningChange
  onGridChangeRef.current = onGridChange
  onErrorRef.current = onError
  const [bootId, setBootId] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false

    const boot = async () => {
      try {
        const app = new Application()
        await app.init({
          background: '#12161c',
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
      safeDestroy(appRef.current)
      appRef.current = null
      playfieldRef.current = null
      host.replaceChildren()
    }
  }, [board.cols, board.rows, resolutionScale])

  useEffect(() => {
    if (!bootId || spinningRef.current) return
    const playfield = playfieldRef.current
    if (!playfield) return

    const grid = fillBoardFromLibrary(libraryRef.current, board)
    if (!grid) {
      onGridChangeRef.current(null)
      onErrorRef.current('Добавьте в Library символы со static WebP.')
      return
    }

    let cancelled = false
    const paint = async () => {
      while (playfield.children.length > 1) {
        playfield.children[1]?.destroy()
      }
      const glyph = SYMBOL_SIZE * CELL_SYMBOL_SIZE
      for (let col = 0; col < grid.length; col += 1) {
        for (let row = 0; row < grid[col]!.length; row += 1) {
          const cell = grid[col]![row]!
          const texture = await loadTexture(cell.staticUrl, cacheRef.current)
          if (cancelled) return
          const sprite = new Sprite(texture)
          sprite.anchor.set(0.5)
          sprite.width = glyph
          sprite.height = glyph
          sprite.x = (col + 0.5) * SYMBOL_SIZE
          sprite.y = (row + 0.5) * SYMBOL_SIZE
          playfield.addChild(sprite)
        }
      }
      onGridChangeRef.current(grid)
      onErrorRef.current(null)
    }

    void paint().catch((err) =>
      onErrorRef.current(err instanceof Error ? err.message : 'Paint failed'),
    )

    return () => {
      cancelled = true
    }
  }, [bootId, board, library])

  useEffect(() => {
    if (spinNonce === 0) return
    const playfield = playfieldRef.current
    if (!playfield) return

    let cancelled = false
    const glyph = SYMBOL_SIZE * CELL_SYMBOL_SIZE
    const { cols, rows } = board

    const run = async () => {
      const finalGrid = fillBoardFromLibrary(libraryRef.current, board, spinNonce * 997)
      if (!finalGrid) {
        onErrorRef.current('Нет static-символов для спина.')
        return
      }

      spinningRef.current = true
      onSpinningChangeRef.current(true)
      while (playfield.children.length > 1) {
        playfield.children[1]?.destroy()
      }

      type ColState = {
        container: Container
        y: number
        stopAt: number
        targetY: number
        stopping: boolean
        done: boolean
      }

      const columns: ColState[] = []
      const start = performance.now()

      for (let col = 0; col < cols; col += 1) {
        const stripPool =
          fillBoardFromLibrary(
            libraryRef.current,
            { cols: 1, rows: rows + PAD * 2 },
            spinNonce + col,
          )?.[0] ?? []
        if (stripPool.length === 0) continue

        const container = new Container()
        container.x = col * SYMBOL_SIZE
        const strip = [...stripPool]
        for (let row = 0; row < rows; row += 1) {
          strip[PAD + row] = finalGrid[col]![row]!
        }

        for (let i = 0; i < strip.length; i += 1) {
          const cell = strip[i]!
          const texture = await loadTexture(cell.staticUrl, cacheRef.current)
          if (cancelled) return
          const sprite = new Sprite(texture)
          sprite.anchor.set(0.5)
          sprite.width = glyph
          sprite.height = glyph
          sprite.x = SYMBOL_SIZE * 0.5
          sprite.y = (i + 0.5) * SYMBOL_SIZE
          container.addChild(sprite)
        }

        const initialY = -PAD * SYMBOL_SIZE
        container.y = initialY
        playfield.addChild(container)
        columns.push({
          container,
          y: initialY,
          stopAt: start + MIN_SPIN_MS + col * STAGGER_MS,
          targetY: -PAD * SYMBOL_SIZE,
          stopping: false,
          done: false,
        })
      }

      const tick = (now: number) => {
        if (cancelled) return
        let allDone = true
        for (const col of columns) {
          if (col.done) continue
          allDone = false

          if (!col.stopping && now >= col.stopAt) {
            col.stopping = true
            col.targetY = -PAD * SYMBOL_SIZE
          }

          if (col.stopping) {
            const dist = col.targetY - col.y
            if (Math.abs(dist) < 1) {
              col.y = col.targetY
              col.container.y = col.y
              col.done = true
              for (const child of col.container.children) {
                if (child instanceof Sprite) {
                  child.scale.set(CELL_SYMBOL_SIZE * 1.08)
                }
              }
            } else {
              col.y += Math.min(Math.max(dist * 0.22, -SPEED), SPEED * 0.5)
              col.container.y = col.y
            }
          } else {
            col.y -= SPEED
            const loopHeight = (rows + PAD) * SYMBOL_SIZE
            if (col.y < -loopHeight) col.y += SYMBOL_SIZE * 2
            col.container.y = col.y
          }
        }

        if (allDone) {
          window.setTimeout(() => {
            if (cancelled || !playfieldRef.current) return
            const field = playfieldRef.current
            const finish = async () => {
              while (field.children.length > 1) {
                field.children[1]?.destroy()
              }
              for (let c = 0; c < finalGrid.length; c += 1) {
                for (let r = 0; r < finalGrid[c]!.length; r += 1) {
                  const cell = finalGrid[c]![r]!
                  const texture = await loadTexture(cell.staticUrl, cacheRef.current)
                  if (cancelled) return
                  const sprite = new Sprite(texture)
                  sprite.anchor.set(0.5)
                  sprite.width = glyph
                  sprite.height = glyph
                  sprite.x = (c + 0.5) * SYMBOL_SIZE
                  sprite.y = (r + 0.5) * SYMBOL_SIZE
                  field.addChild(sprite)
                }
              }
              onGridChangeRef.current(finalGrid)
              spinningRef.current = false
              onSpinningChangeRef.current(false)
            }
            void finish()
          }, 100)
          return
        }

        rafRef.current = requestAnimationFrame(tick)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    void run().catch((err) => {
      spinningRef.current = false
      onSpinningChangeRef.current(false)
      onErrorRef.current(err instanceof Error ? err.message : 'Spin failed')
    })

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [spinNonce, board])

  return <div className="reel-board-host" ref={hostRef} />
}
