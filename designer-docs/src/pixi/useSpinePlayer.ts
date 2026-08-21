import { useEffect, useRef, useState } from 'react'
import type { Application } from 'pixi.js'
import type { Spine } from '@esotericsoftware/spine-pixi-v8'
import type {
  AnimationRoleMap,
  PlaybackState,
  SpineAssetSource,
  SpineMetrics,
} from '../types'
import { defaultAnimationName, resolveAnimationRoles } from './animationRoles'
import { fitSpineToView } from './previewLayout'
import { listAnimationNames, loadSpineFromSource, type LoadedSpineBundle } from './spineLoader'
import { collectSpineMetrics } from './useSpineMetrics'

type UseSpinePlayerArgs = {
  app: Application | null
  source: SpineAssetSource | null
  playback: PlaybackState
  onAnimationsChange: (names: string[], roles: AnimationRoleMap) => void
  onMetricsChange: (metrics: SpineMetrics | null) => void
  onError: (message: string | null) => void
  onLoadingChange: (loading: boolean) => void
}

const EMPTY_ROLES: AnimationRoleMap = {
  idle: null,
  bounce: null,
  win: null,
}

export function useSpinePlayer({
  app,
  source,
  playback,
  onAnimationsChange,
  onMetricsChange,
  onError,
  onLoadingChange,
}: UseSpinePlayerArgs) {
  const bundleRef = useRef<LoadedSpineBundle | null>(null)
  const spineRef = useRef<Spine | null>(null)
  const playbackRef = useRef(playback)
  playbackRef.current = playback
  const [readyTick, setReadyTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const loadId = Symbol('spine-load')

    const clearStageSpine = () => {
      bundleRef.current?.dispose()
      bundleRef.current = null
      spineRef.current = null
    }

    if (!app || !source) {
      clearStageSpine()
      onAnimationsChange([], EMPTY_ROLES)
      onMetricsChange(null)
      onLoadingChange(false)
      return () => {
        cancelled = true
      }
    }

    const run = async () => {
      onLoadingChange(true)
      onError(null)
      clearStageSpine()

      try {
        const bundle = await loadSpineFromSource(source)
        if (cancelled) {
          bundle.dispose()
          return
        }

        bundleRef.current = bundle
        spineRef.current = bundle.spine
        app.stage.addChild(bundle.spine)

        const names = listAnimationNames(bundle.spine)
        const roles = resolveAnimationRoles(names)
        onAnimationsChange(names, roles)

        const current = playbackRef.current
        const initial = current.animationName ?? defaultAnimationName(roles, names)
        if (initial) {
          bundle.spine.state.setAnimation(0, initial, current.loop)
          bundle.spine.state.timeScale = current.speed
        }

        fitSpineToView(bundle.spine, app.screen.width, app.screen.height)
        onMetricsChange(
          collectSpineMetrics(bundle.spine, initial, source.textureUrl, bundle.atlas),
        )
        setReadyTick((value) => value + 1)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Failed to load Spine assets'
        onError(message)
        onMetricsChange(null)
        onAnimationsChange([], EMPTY_ROLES)
      } finally {
        if (!cancelled) onLoadingChange(false)
      }
    }

    void run()

    return () => {
      cancelled = true
      clearStageSpine()
      onLoadingChange(false)
      void loadId
    }
  }, [app, source, onAnimationsChange, onMetricsChange, onError, onLoadingChange])

  useEffect(() => {
    const spine = spineRef.current
    const bundle = bundleRef.current
    if (!app || !spine || !bundle || !source || !playback.animationName) return

    try {
      spine.state.setAnimation(0, playback.animationName, playback.loop)
      spine.state.timeScale = playback.speed
      fitSpineToView(spine, app.screen.width, app.screen.height)
      onMetricsChange(
        collectSpineMetrics(spine, playback.animationName, source.textureUrl, bundle.atlas),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to play animation'
      onError(message)
    }
  }, [
    app,
    playback.animationName,
    playback.loop,
    playback.speed,
    playback.playNonce,
    readyTick,
    source,
    onMetricsChange,
    onError,
  ])

  useEffect(() => {
    if (!app) return

    const onResize = () => {
      const spine = spineRef.current
      if (!spine) return
      fitSpineToView(spine, app.screen.width, app.screen.height)
    }

    app.renderer.on('resize', onResize)
    return () => {
      app.renderer.off('resize', onResize)
    }
  }, [app, readyTick])
}
