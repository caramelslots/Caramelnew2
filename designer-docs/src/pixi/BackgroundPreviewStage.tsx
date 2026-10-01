import '@esotericsoftware/spine-pixi-v8'
import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import {
  DEFAULT_BOARD_COLS,
  DEFAULT_BOARD_ROWS,
  type BoardDimensions,
} from '../reel/constants'
import { createStageLayers, type StageLayers } from '../stage/buildStage'
import { getDefaultStageUrls } from '../stage/defaultStageUrls'
import {
  BACKGROUND_STATIC_HEIGHT,
  BACKGROUND_STATIC_WIDTH,
} from '../catalog/backgroundSpecs'
import type { StageBackgroundSpinePack } from '../stage/stagePack'

type BackgroundPreviewStageProps = {
  staticUrl: string
  spinePack: StageBackgroundSpinePack | null
  onError: (message: string | null) => void
  onLoadingChange: (loading: boolean) => void
}

const PREVIEW_BOARD: BoardDimensions = {
  cols: DEFAULT_BOARD_COLS,
  rows: DEFAULT_BOARD_ROWS,
}

function safeDestroy(app: Application | null) {
  if (!app?.renderer || !app.stage) return
  try {
    app.destroy(true)
  } catch {
    // StrictMode / remount races.
  }
}

const PREVIEW_CANVAS = {
  width: BACKGROUND_STATIC_WIDTH,
  height: BACKGROUND_STATIC_HEIGHT,
} as const

/**
 * Fullscreen background preview — Pixi viewport 1920×1080 (design handoff size),
 * scaled to fit the modal frame via CSS.
 */
export function BackgroundPreviewStage({
  staticUrl,
  spinePack,
  onError,
  onLoadingChange,
}: BackgroundPreviewStageProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    let app: Application | null = null
    let layers: StageLayers | null = null

    const boot = async () => {
      onLoadingChange(true)
      onError(null)

      try {
        const instance = new Application()
        await instance.init({
          background: '#0e1115',
          width: PREVIEW_CANVAS.width,
          height: PREVIEW_CANVAS.height,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          preference: 'webgl',
        })

        if (cancelled) {
          safeDestroy(instance)
          return
        }

        app = instance
        host.replaceChildren(instance.canvas)

        const stageUrls = {
          ...getDefaultStageUrls(),
          background: staticUrl,
        }

        layers = await createStageLayers(
          PREVIEW_BOARD,
          () => PREVIEW_CANVAS,
          () => 'desktop',
          stageUrls,
          spinePack,
          { keepStillWithSpine: Boolean(spinePack) },
        )

        if (cancelled) {
          layers.dispose()
          return
        }

        layers.contentRoot.visible = false
        instance.stage.addChild(layers.backgroundRoot)

        const layout = () => {
          layers?.layout()
          instance.render()
        }
        layout()
        onLoadingChange(false)
      } catch (err) {
        if (!cancelled) {
          onLoadingChange(false)
          onError(err instanceof Error ? err.message : 'Background preview failed')
        }
      }
    }

    void boot()

    return () => {
      cancelled = true
      layers?.dispose()
      layers = null
      safeDestroy(app)
      host.replaceChildren()
    }
  }, [staticUrl, spinePack, onError, onLoadingChange])

  return <div className="background-preview-stage" ref={hostRef} />
}
