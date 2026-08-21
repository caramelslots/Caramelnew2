import { useEffect, useRef, useState } from 'react'
import { Application, Graphics } from 'pixi.js'
import { drawPreviewGrid } from './previewLayout'

type PixiCanvasProps = {
  onAppReady: (app: Application | null) => void
  className?: string
}

function safeDestroy(app: Application | null) {
  if (!app) return
  try {
    // Double-destroy (StrictMode / remount) leaves renderer null after first pass.
    if (app.renderer && app.stage) {
      app.destroy(true)
    }
  } catch {
    // Ignore teardown races.
  }
}

export function PixiCanvas({ onAppReady, className }: PixiCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    let app: Application | null = null
    let grid: Graphics | null = null
    let observer: ResizeObserver | null = null

    const boot = async () => {
      try {
        const instance = new Application()
        await instance.init({
          backgroundAlpha: 0,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          resizeTo: host,
          preference: 'webgl',
        })

        if (cancelled) {
          safeDestroy(instance)
          return
        }

        app = instance
        host.replaceChildren(app.canvas)
        grid = new Graphics()
        app.stage.addChild(grid)
        drawPreviewGrid(grid, app.screen.width, app.screen.height)

        const redraw = () => {
          if (!app || !grid || cancelled) return
          drawPreviewGrid(grid, app.screen.width, app.screen.height)
        }

        app.renderer.on('resize', redraw)
        observer = new ResizeObserver(() => {
          redraw()
        })
        observer.observe(host)

        onAppReady(app)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to start Pixi'
        setError(message)
        onAppReady(null)
      }
    }

    void boot()

    return () => {
      cancelled = true
      observer?.disconnect()
      onAppReady(null)
      safeDestroy(app)
      app = null
      host.replaceChildren()
    }
  }, [onAppReady])

  return (
    <div className={className} ref={hostRef}>
      {error ? <p className="canvas-error">{error}</p> : null}
    </div>
  )
}
