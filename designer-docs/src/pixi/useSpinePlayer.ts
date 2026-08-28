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
import { fitSpineToView, type FitSpineOptions } from './previewLayout'
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
  /** Hold setup pose until playback.animationName is set. */
  startEmpty?: boolean
  /** Return to setup pose after a one-shot clip completes. */
  resetOnComplete?: boolean
  fitOptions?: FitSpineOptions
  onPlaybackComplete?: () => void
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
  startEmpty = false,
  resetOnComplete = false,
  fitOptions,
  onPlaybackComplete,
}: UseSpinePlayerArgs) {
  const bundleRef = useRef<LoadedSpineBundle | null>(null)
  const spineRef = useRef<Spine | null>(null)
  const playbackRef = useRef(playback)
  playbackRef.current = playback
  const fitOptionsRef = useRef(fitOptions)
  fitOptionsRef.current = fitOptions
  const onPlaybackCompleteRef = useRef(onPlaybackComplete)
  onPlaybackCompleteRef.current = onPlaybackComplete
  const completeListenerRef = useRef<{ complete: (entry: { animation?: { name: string } }) => void } | null>(
    null,
  )
  const [readyTick, setReadyTick] = useState(0)

  const detachCompleteListener = (spine: Spine | null) => {
    const listener = completeListenerRef.current
    if (!spine || !listener) return
    try {
      spine.state?.removeListener(listener)
    } catch {
      // Spine may already be destroyed during accordion / canvas teardown.
    }
    if (completeListenerRef.current === listener) {
      completeListenerRef.current = null
    }
  }

  const refit = (spine: Spine, viewWidth: number, viewHeight: number) => {
    fitSpineToView(spine, viewWidth, viewHeight, fitOptionsRef.current)
  }

  const resetToSetup = (spine: Spine) => {
    spine.state.setEmptyAnimation(0, 0)
    spine.skeleton.setToSetupPose()
    spine.update(0)
  }

  useEffect(() => {
    let cancelled = false
    const loadId = Symbol('spine-load')

    const clearStageSpine = () => {
      detachCompleteListener(spineRef.current)
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
        const initial = startEmpty
          ? null
          : (current.animationName ?? defaultAnimationName(roles, names))
        if (initial) {
          bundle.spine.state.setAnimation(0, initial, current.loop)
          bundle.spine.state.timeScale = current.speed
        } else {
          resetToSetup(bundle.spine)
        }

        refit(bundle.spine, app.screen.width, app.screen.height)
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
  }, [app, source, startEmpty, onAnimationsChange, onMetricsChange, onError, onLoadingChange])

  useEffect(() => {
    const spine = spineRef.current
    const bundle = bundleRef.current
    if (!app || !spine || !bundle || !source) return

    if (!playback.animationName) {
      resetToSetup(spine)
      refit(spine, app.screen.width, app.screen.height)
      return
    }

    try {
      resetToSetup(spine)
      spine.state.setAnimation(0, playback.animationName, playback.loop)
      spine.state.timeScale = playback.speed
      refit(spine, app.screen.width, app.screen.height)
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
      refit(spine, app.screen.width, app.screen.height)
    }

    app.renderer.on('resize', onResize)
    return () => {
      try {
        app.renderer?.off('resize', onResize)
      } catch {
        // App may already be destroyed when PixiCanvas unmounts first.
      }
    }
  }, [app, readyTick])

  useEffect(() => {
    const spine = spineRef.current
    const appInstance = app
    if (!spine || !appInstance || !resetOnComplete) return

    detachCompleteListener(spine)

    const listener = {
      complete: (entry: { animation?: { name: string } }) => {
        const clip = playbackRef.current.animationName
        if (!clip || entry.animation?.name !== clip || playbackRef.current.loop) return
        resetToSetup(spine)
        refit(spine, appInstance.screen.width, appInstance.screen.height)
        onPlaybackCompleteRef.current?.()
      },
    }

    completeListenerRef.current = listener
    spine.state.addListener(listener)
    return () => {
      detachCompleteListener(spine)
    }
  }, [app, readyTick, resetOnComplete])
}
