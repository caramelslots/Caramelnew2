import { useCallback, useState } from 'react'
import type { Application } from 'pixi.js'
import type {
  AnimationRoleMap,
  PlaybackState,
  SpineAssetSource,
  SpineMetrics,
} from '../types'
import { PixiCanvas } from './PixiCanvas'
import { useSpinePlayer } from './useSpinePlayer'

type SpinePreviewStageProps = {
  source: SpineAssetSource | null
  playback: PlaybackState
  onAnimationsChange: (names: string[], roles: AnimationRoleMap) => void
  onMetricsChange: (metrics: SpineMetrics | null) => void
  onError: (message: string | null) => void
  onLoadingChange: (loading: boolean) => void
}

export function SpinePreviewStage({
  source,
  playback,
  onAnimationsChange,
  onMetricsChange,
  onError,
  onLoadingChange,
}: SpinePreviewStageProps) {
  const [app, setApp] = useState<Application | null>(null)
  const handleAppReady = useCallback((next: Application | null) => {
    setApp(next)
  }, [])

  useSpinePlayer({
    app,
    source,
    playback,
    onAnimationsChange,
    onMetricsChange,
    onError,
    onLoadingChange,
  })

  return <PixiCanvas className="pixi-host" onAppReady={handleAppReady} />
}
