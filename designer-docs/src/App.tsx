import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@esotericsoftware/spine-pixi-v8'
import { AppShell, type WorkspaceMode } from './components/layout/AppShell'
import { DesignerGuideAccordion } from './components/docs/DesignerGuideAccordion'
import { SymbolLibraryPanel } from './components/library/SymbolLibraryPanel'
import { MetricsPanel } from './components/metrics/MetricsPanel'
import {
  ReelInspectPanel,
  type QuickScenarioId,
} from './components/reel/ReelInspectPanel'
import { ReelLabStage } from './components/reel/ReelLabStage'
import { AnimationControls } from './components/symbols/AnimationControls'
import { SymbolInfoCard } from './components/symbols/SymbolInfoCard'
import { CustomUploadPanel } from './components/upload/CustomUploadPanel'
import type { ValidatedUpload } from './components/upload/UploadValidation'
import {
  createCatalogLibrarySymbols,
  createLibrarySymbolFromUpload,
  librarySymbolToSpineSource,
} from './library/createLibrarySymbol'
import { computeLibraryStatus, type LibrarySymbol } from './library/types'
import { SpinePreviewStage } from './pixi/SpinePreviewStage'
import { defaultAnimationName } from './pixi/animationRoles'
import {
  DEFAULT_BOARD_COLS,
  DEFAULT_BOARD_ROWS,
  type BoardDimensions,
} from './reel/constants'
import type { BoardGrid } from './reel/fillBoard'
import { MAX_LIVE_IDLE_SPINES } from './reel/spineBudget'
import type { QualityReport } from './stage/qualityLab'
import type { DevicePresetId, QualityPresetId } from './stage/presets'
import type {
  AnimationRole,
  AnimationRoleMap,
  PlaybackState,
  SpineMetrics,
} from './types'

export default function App() {
  const [mode, setMode] = useState<WorkspaceMode>('symbol')
  const [library, setLibrary] = useState<LibrarySymbol[]>(() => createCatalogLibrarySymbols())
  const libraryRef = useRef(library)
  libraryRef.current = library

  const [selectedId, setSelectedId] = useState<string | null>(
    () => library[0]?.id ?? null,
  )

  const selected = useMemo(
    () => library.find((item) => item.id === selectedId) ?? null,
    [library, selectedId],
  )

  const selectedSpineKey = selected
    ? [
        selected.id,
        selected.kind,
        selected.status.spineOk ? '1' : '0',
        selected.spine.skeletonUrl,
        selected.spine.atlasUrl,
        selected.spine.textureUrl,
        selected.spine.textureFileName,
        selected.spine.atlasTextureName ?? '',
        selected.label,
      ].join('|')
    : ''

  const source = useMemo(() => {
    if (!selected || !selected.status.spineOk) return null
    return librarySymbolToSpineSource(selected)
    // selectedSpineKey captures the spine identity without roles/status churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpineKey])

  const [animationNames, setAnimationNames] = useState<string[]>([])
  const [roles, setRoles] = useState<AnimationRoleMap>({
    idle: null,
    bounce: null,
    win: null,
  })
  const [playback, setPlayback] = useState<PlaybackState>({
    animationName: null,
    loop: true,
    speed: 1,
    playNonce: 0,
  })
  const [metrics, setMetrics] = useState<SpineMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [board, setBoard] = useState<BoardDimensions>({
    cols: DEFAULT_BOARD_COLS,
    rows: DEFAULT_BOARD_ROWS,
  })
  const [deviceId, setDeviceId] = useState<DevicePresetId>('desktop')
  const [qualityId, setQualityId] = useState<QualityPresetId>('1080p')
  const [reelGrid, setReelGrid] = useState<BoardGrid | null>(null)
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null)
  const [scenarioRequest, setScenarioRequest] = useState<{
    id: QuickScenarioId
    nonce: number
  } | null>(null)

  const handleQuickScenario = useCallback((id: QuickScenarioId) => {
    setMode('reel')
    setScenarioRequest({ id, nonce: Date.now() })
  }, [])

  const handleQualityReport = useCallback((report: QualityReport) => {
    setQualityReport(report)
  }, [])

  useEffect(
    () => () => {
      for (const item of libraryRef.current) {
        if (item.kind === 'upload') item.revoke()
      }
    },
    [],
  )

  const selectSymbol = (id: string) => {
    setSelectedId(id)
    setPlayback((prev) => ({ ...prev, animationName: null, playNonce: prev.playNonce + 1 }))
    setError(null)
    setAnimationNames([])
    setRoles({ idle: null, bounce: null, win: null })
    setMetrics(null)
  }

  const addUploads = (payloads: ValidatedUpload[]) => {
    const created = payloads.map((payload) => createLibrarySymbolFromUpload(payload))
    setLibrary((prev) => [...prev, ...created])
    const last = created[created.length - 1]
    if (last) selectSymbol(last.id)
  }

  const handleUpload = (payload: ValidatedUpload) => {
    addUploads([payload])
  }

  const handleRemove = (id: string) => {
    setLibrary((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.kind === 'upload') target.revoke()
      return prev.filter((item) => item.id !== id)
    })
    setSelectedId((current) => {
      if (current !== id) return current
      const remaining = libraryRef.current.filter((item) => item.id !== id)
      return remaining[0]?.id ?? null
    })
  }

  const handleAnimationsChange = useCallback(
    (names: string[], nextRoles: AnimationRoleMap) => {
      setAnimationNames(names)
      setRoles(nextRoles)
      setPlayback((prev) => ({
        ...prev,
        animationName: defaultAnimationName(nextRoles, names),
        playNonce: prev.playNonce + 1,
      }))

      setLibrary((prev) =>
        prev.map((item) => {
          if (item.id !== selectedId) return item
          const sameNames =
            item.animationNames.length === names.length &&
            item.animationNames.every((name, index) => name === names[index])
          const sameRoles =
            item.roles?.idle === nextRoles.idle &&
            item.roles?.bounce === nextRoles.bounce &&
            item.roles?.win === nextRoles.win
          if (sameNames && sameRoles) return item
          const status = computeLibraryStatus({
            hasSpine: item.status.spineOk,
            staticSprite: item.staticSprite,
            roles: nextRoles,
          })
          return {
            ...item,
            roles: nextRoles,
            animationNames: names,
            status,
          }
        }),
      )
    },
    [selectedId],
  )

  const playClip = (animationName: string) => {
    setPlayback((prev) => ({
      ...prev,
      animationName,
      playNonce: prev.playNonce + 1,
    }))
  }

  const customActive = selected?.kind === 'upload'

  return (
    <AppShell
      mode={mode}
      onModeChange={setMode}
      docs={<DesignerGuideAccordion />}
      left={
        <>
          <SymbolLibraryPanel
            selectedId={selectedId}
            symbols={library}
            onRemove={handleRemove}
            onSelect={selectSymbol}
          />
          {mode === 'symbol' ? (
            <CustomUploadPanel onUpload={handleUpload} onUploadMany={addUploads} />
          ) : null}
        </>
      }
      center={
        mode === 'reel' ? (
          <ReelLabStage
            board={board}
            deviceId={deviceId}
            qualityId={qualityId}
            scenarioRequest={scenarioRequest}
            symbols={library}
            onBoardChange={setBoard}
            onDeviceChange={setDeviceId}
            onGridChange={setReelGrid}
            onQualityChange={setQualityId}
            onQualityReport={handleQualityReport}
          />
        ) : (
          <div className="stage-frame">
            <div className="stage-frame__bar">
              <span>
                {loading ? 'Loading…' : source ? 'Live preview' : 'No symbol / no spine'}
              </span>
              {customActive ? <span className="chip">Custom</span> : null}
              {selected ? (
                <span className={`chip chip--${selected.status.readiness}`}>
                  {selected.status.readiness}
                </span>
              ) : null}
            </div>
            <SpinePreviewStage
              playback={playback}
              source={source}
              onAnimationsChange={handleAnimationsChange}
              onError={setError}
              onLoadingChange={setLoading}
              onMetricsChange={setMetrics}
            />
          </div>
        )
      }
      right={
        mode === 'reel' ? (
          <ReelInspectPanel
            board={board}
            deviceId={deviceId}
            grid={reelGrid}
            library={library}
            qualityId={qualityId}
            qualityReport={qualityReport}
            selected={selected}
            spineBudget={MAX_LIVE_IDLE_SPINES}
            onQuickScenario={handleQuickScenario}
            onSelectSymbol={selectSymbol}
          />
        ) : (
          <>
            <SymbolInfoCard error={error} source={source} />
            {selected?.status.warnings.length ? (
              <section className="panel-block panel-block--alert">
                <div className="panel-block__head">
                  <h2>Warnings</h2>
                  <p>Проверка static / клипов</p>
                </div>
                <ul className="library-warnings">
                  {selected.status.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            <AnimationControls
              activeAnimation={playback.animationName}
              animationNames={animationNames}
              disabled={loading || !source || Boolean(error)}
              loop={playback.loop}
              roles={roles}
              speed={playback.speed}
              onLoopChange={(loop) => setPlayback((prev) => ({ ...prev, loop }))}
              onPlayRole={(role: AnimationRole) => {
                const clip = roles[role]
                if (!clip) return
                playClip(clip)
              }}
              onSelectAnimation={playClip}
              onSpeedChange={(speed) => setPlayback((prev) => ({ ...prev, speed }))}
            />
            <MetricsPanel loading={loading} metrics={metrics} />
          </>
        )
      }
    />
  )
}
