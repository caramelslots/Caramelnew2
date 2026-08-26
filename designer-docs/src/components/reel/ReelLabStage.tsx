import { useEffect, useMemo, useRef, useState } from 'react'
import type { LibrarySymbol } from '../../library/types'
import { type BoardDimensions } from '../../reel/constants'
import { readyStaticSymbols, type BoardGrid } from '../../reel/fillBoard'
import { ReelBoardCanvas } from '../../reel/ReelBoardCanvas'
import { resolveStageUrls } from '../../stage/defaultStageUrls'
import { layoutKindForDevice } from '../../stage/deviceFit'
import { analyzeQuality, type QualityReport } from '../../stage/qualityLab'
import {
  DEVICE_PRESETS,
  QUALITY_PRESETS,
  type DevicePresetId,
  type QualityPresetId,
} from '../../stage/presets'
import type { StagePackOverrides } from '../../stage/stagePack'
import { DeviceViewport } from '../stage/DeviceViewport'
import type { QuickScenarioId } from './ReelInspectPanel'
import { ReelLabSettingsDrawer } from './ReelLabSettingsDrawer'

function getFullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null }
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

async function requestElFullscreen(el: HTMLElement): Promise<void> {
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void
  }
  if (el.requestFullscreen) {
    await el.requestFullscreen()
    return
  }
  if (anyEl.webkitRequestFullscreen) {
    await anyEl.webkitRequestFullscreen()
  }
}

async function exitElFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null
    webkitExitFullscreen?: () => Promise<void> | void
  }
  if (document.fullscreenElement && document.exitFullscreen) {
    await document.exitFullscreen()
    return
  }
  if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
    await doc.webkitExitFullscreen()
  }
}

type ReelLabStageProps = {
  symbols: LibrarySymbol[]
  board: BoardDimensions
  deviceId: DevicePresetId
  qualityId: QualityPresetId
  scenarioRequest?: { id: QuickScenarioId; nonce: number } | null
  onBoardChange: (board: BoardDimensions) => void
  onDeviceChange: (id: DevicePresetId) => void
  onQualityChange: (id: QualityPresetId) => void
  onGridChange?: (grid: BoardGrid | null) => void
  onQualityReport?: (report: QualityReport) => void
}

export function ReelLabStage({
  symbols,
  board,
  deviceId,
  qualityId,
  scenarioRequest = null,
  onBoardChange,
  onDeviceChange,
  onQualityChange,
  onGridChange,
  onQualityReport,
}: ReelLabStageProps) {
  const device = DEVICE_PRESETS.find((item) => item.id === deviceId) ?? DEVICE_PRESETS[0]!
  const quality = QUALITY_PRESETS.find((item) => item.id === qualityId) ?? QUALITY_PRESETS[2]!
  const layoutKind = layoutKindForDevice(device.id)
  const pool = useMemo(() => readyStaticSymbols(symbols), [symbols])
  const poolIdsKey = pool.map((item) => item.id).join('|')
  const staticReady = pool.length

  const [spinNonce, setSpinNonce] = useState(0)
  const [winNonce, setWinNonce] = useState(0)
  const [refillNonce, setRefillNonce] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [grid, setGrid] = useState<BoardGrid | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [useSpineAfterStop, setUseSpineAfterStop] = useState(true)
  const [showEnvironment, setShowEnvironment] = useState(true)
  const [allowedIds, setAllowedIds] = useState<string[] | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [stageOverrides, setStageOverrides] = useState<StagePackOverrides>({})
  const [isFullscreen, setIsFullscreen] = useState(false)
  const labRef = useRef<HTMLDivElement>(null)

  const stageUrls = useMemo(() => resolveStageUrls(stageOverrides), [stageOverrides])

  // When library grows/shrinks, keep filter in sync and auto-include new uploads.
  useEffect(() => {
    setAllowedIds((prev) => {
      if (prev === null) return null
      const poolIds = pool.map((item) => item.id)
      const poolSet = new Set(poolIds)
      const kept = prev.filter((id) => poolSet.has(id))
      const added = poolIds.filter((id) => !prev.includes(id))
      const next = [...kept, ...added]
      if (next.length === 0) return []
      if (next.length === poolIds.length) return null
      return next
    })
    setRefillNonce((value) => value + 1)
    // poolIdsKey tracks identity of ready symbols without depending on pool array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolIdsKey])

  useEffect(() => {
    const sync = () => {
      setIsFullscreen(getFullscreenElement() === labRef.current)
    }
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])

  const qualityReport = useMemo(
    () =>
      analyzeQuality({
        device,
        quality,
        layoutKind,
        boardCols: board.cols,
        boardRows: board.rows,
      }),
    [device, quality, layoutKind, board.cols, board.rows],
  )

  useEffect(() => {
    onQualityReport?.(qualityReport)
  }, [qualityReport, onQualityReport])

  useEffect(() => {
    if (!scenarioRequest) return
    switch (scenarioRequest.id) {
      case 'desktop-1080':
        onDeviceChange('desktop')
        onQualityChange('1080p')
        break
      case 'popout-720':
        onDeviceChange('popoutS')
        onQualityChange('720p')
        break
      case 'mobile-1080':
        onDeviceChange('mobileM')
        onQualityChange('1080p')
        break
    }
    setRefillNonce((value) => value + 1)
  }, [scenarioRequest, onDeviceChange, onQualityChange])

  const setGridAndNotify = (next: BoardGrid | null) => {
    setGrid(next)
    onGridChange?.(next)
  }

  const canSpin = staticReady > 0 && !spinning
  const canWin = Boolean(grid) && !spinning && useSpineAfterStop

  const toggleFullscreen = () => {
    const el = labRef.current
    if (!el) return
    void (async () => {
      try {
        if (getFullscreenElement() === el) await exitElFullscreen()
        else await requestElFullscreen(el)
      } catch {
        setError('Fullscreen недоступен в этом браузере.')
      }
    })()
  }

  const toggleAllowed = (id: string) => {
    setAllowedIds((prev) => {
      const base = prev ?? pool.map((item) => item.id)
      const next = base.includes(id) ? base.filter((item) => item !== id) : [...base, id]
      if (next.length === pool.length) return null
      return next
    })
  }

  const sharedBoardProps = {
    allowedSymbolIds: allowedIds,
    backgroundSpine: stageOverrides.backgroundSpine ?? null,
    board,
    layoutKind,
    library: symbols,
    refillNonce,
    showEnvironment,
    spinNonce,
    stageUrls,
    useSpineAfterStop,
    winNonce,
  }

  return (
    <div
      ref={labRef}
      className={['reel-lab', isFullscreen ? 'reel-lab--fullscreen' : ''].filter(Boolean).join(' ')}
    >
      <div className="reel-lab__bar">
        <div className="reel-lab__bar-meta">
          <span className="reel-lab__pill">
            {device.label} · {device.width}×{device.height}
          </span>
          <span className="reel-lab__pill">{quality.label}</span>
          <span className="reel-lab__pill">
            {board.cols}×{board.rows}
          </span>
        </div>

        <div className="reel-lab__actions">
          <button
            className="btn btn--primary"
            disabled={!canSpin}
            type="button"
            onClick={() => setSpinNonce((value) => value + 1)}
          >
            {spinning ? 'Spinning…' : 'Spin'}
          </button>
          <button
            className="btn"
            disabled={!canWin}
            type="button"
            onClick={() => setWinNonce((value) => value + 1)}
          >
            Win
          </button>
          <button
            className="btn"
            disabled={staticReady === 0 || spinning}
            type="button"
            onClick={() => setRefillNonce((value) => value + 1)}
          >
            Refill
          </button>
          <button
            aria-expanded={settingsOpen}
            className={settingsOpen ? 'btn is-active' : 'btn'}
            type="button"
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </button>
          <button
            aria-pressed={isFullscreen}
            className={isFullscreen ? 'btn is-active' : 'btn btn--ghost'}
            title={isFullscreen ? 'Выйти из полного экрана (Esc)' : 'Reel Lab на весь экран'}
            type="button"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? 'Exit FS' : 'Fullscreen'}
          </button>
        </div>
      </div>

      <div className="reel-lab__stage">
        <DeviceViewport
          density={qualityReport.density}
          device={device}
          qualityLabel={quality.label}
        >
          <ReelBoardCanvas
            {...sharedBoardProps}
            resolutionScale={qualityReport.resolutionScale}
            onError={setError}
            onGridChange={setGridAndNotify}
            onSpinningChange={setSpinning}
          />
        </DeviceViewport>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <ReelLabSettingsDrawer
        allowedIds={allowedIds}
        board={board}
        deviceId={deviceId}
        open={settingsOpen}
        pool={pool}
        qualityId={qualityId}
        showEnvironment={showEnvironment}
        stageOverrides={stageOverrides}
        useSpineAfterStop={useSpineAfterStop}
        onBoardChange={onBoardChange}
        onClose={() => setSettingsOpen(false)}
        onDeviceChange={onDeviceChange}
        onQualityChange={onQualityChange}
        onShowEnvironmentChange={setShowEnvironment}
        onStageOverridesChange={setStageOverrides}
        onToggleAllowed={toggleAllowed}
        onUseSpineAfterStopChange={setUseSpineAfterStop}
      />
    </div>
  )
}
