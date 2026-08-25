import { useEffect, useMemo, useRef, useState } from 'react'
import type { LibrarySymbol } from '../../library/types'
import {
  MIN_BOARD_COLS,
  MIN_BOARD_ROWS,
  clampBoardDim,
  type BoardDimensions,
} from '../../reel/constants'
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
import { SlotHudShell } from '../stage/SlotHudShell'
import { StageAssetsPanel } from '../stage/StageAssetsPanel'
import type { QuickScenarioId } from './ReelInspectPanel'

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
  const staticReady = pool.length

  const [spinNonce, setSpinNonce] = useState(0)
  const [winNonce, setWinNonce] = useState(0)
  const [refillNonce, setRefillNonce] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [spinningB, setSpinningB] = useState(false)
  const [grid, setGrid] = useState<BoardGrid | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [useSpineAfterStop, setUseSpineAfterStop] = useState(true)
  const [showEnvironment, setShowEnvironment] = useState(true)
  const [allowedIds, setAllowedIds] = useState<string[] | null>(null)
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [compareQualityId, setCompareQualityId] = useState<QualityPresetId>('720p')
  const [showMore, setShowMore] = useState(false)
  const [stageOverrides, setStageOverrides] = useState<StagePackOverrides>({})
  const [isFullscreen, setIsFullscreen] = useState(false)
  const labRef = useRef<HTMLDivElement>(null)

  const stageUrls = useMemo(() => resolveStageUrls(stageOverrides), [stageOverrides])

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

  const compareQuality =
    QUALITY_PRESETS.find((item) => item.id === compareQualityId) ?? QUALITY_PRESETS[3]!

  const reportA = useMemo(
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

  const reportB = useMemo(
    () =>
      analyzeQuality({
        device,
        quality: compareQuality,
        layoutKind,
        boardCols: board.cols,
        boardRows: board.rows,
      }),
    [device, compareQuality, layoutKind, board.cols, board.rows],
  )

  useEffect(() => {
    onQualityReport?.(reportA)
  }, [reportA, onQualityReport])

  useEffect(() => {
    if (!scenarioRequest) return
    switch (scenarioRequest.id) {
      case 'desktop-1080':
        onDeviceChange('desktop')
        onQualityChange('1080p')
        setCompareEnabled(false)
        break
      case 'popout-720':
        onDeviceChange('popoutS')
        onQualityChange('720p')
        setCompareEnabled(false)
        break
      case 'mobile-1080':
        onDeviceChange('mobileM')
        onQualityChange('1080p')
        setCompareEnabled(false)
        break
      case 'compare-4k-720':
        onDeviceChange('desktop')
        onQualityChange('4k')
        setCompareQualityId('720p')
        setCompareEnabled(true)
        break
    }
    setRefillNonce((value) => value + 1)
  }, [scenarioRequest, onDeviceChange, onQualityChange])

  const setGridAndNotify = (next: BoardGrid | null) => {
    setGrid(next)
    onGridChange?.(next)
  }

  const canSpin = staticReady > 0 && !spinning && !spinningB
  const canWin = Boolean(grid) && !spinning && !spinningB && useSpineAfterStop

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
      className={[
        'reel-lab',
        showMore ? 'reel-lab--more' : '',
        isFullscreen ? 'reel-lab--fullscreen' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="reel-lab__bar">
        <label className="field field--inline">
          <span>Device</span>
          <select
            value={deviceId}
            onChange={(event) => onDeviceChange(event.target.value as DevicePresetId)}
          >
            {DEVICE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label} · {preset.width}×{preset.height}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--inline">
          <span>Quality</span>
          <select
            value={qualityId}
            onChange={(event) => onQualityChange(event.target.value as QualityPresetId)}
          >
            {QUALITY_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        {compareEnabled ? (
          <label className="field field--inline">
            <span>vs B</span>
            <select
              value={compareQualityId}
              onChange={(event) =>
                setCompareQualityId(event.target.value as QualityPresetId)
              }
            >
              {QUALITY_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="check-field reel-lab__check">
          <input
            checked={compareEnabled}
            type="checkbox"
            onChange={(event) => setCompareEnabled(event.target.checked)}
          />
          <span>A/B</span>
        </label>

        <div className="reel-lab__actions">
          <button
            className="btn btn--primary"
            disabled={!canSpin}
            type="button"
            onClick={() => setSpinNonce((value) => value + 1)}
          >
            {spinning || spinningB ? 'Spinning…' : 'Spin'}
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
            disabled={staticReady === 0 || spinning || spinningB}
            type="button"
            onClick={() => setRefillNonce((value) => value + 1)}
          >
            Refill
          </button>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => setShowMore((open) => !open)}
          >
            {showMore ? 'Less' : 'More'}
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

      {showMore ? (
        <div className="reel-lab__more-wrap">
          <div className="reel-lab__more">
            <label className="field field--inline">
              <span>Cols</span>
              <input
                min={MIN_BOARD_COLS}
                type="number"
                value={board.cols}
                onChange={(event) =>
                  onBoardChange({
                    ...board,
                    cols: clampBoardDim(Number(event.target.value), MIN_BOARD_COLS),
                  })
                }
              />
            </label>
            <label className="field field--inline">
              <span>Rows</span>
              <input
                min={MIN_BOARD_ROWS}
                type="number"
                value={board.rows}
                onChange={(event) =>
                  onBoardChange({
                    ...board,
                    rows: clampBoardDim(Number(event.target.value), MIN_BOARD_ROWS),
                  })
                }
              />
            </label>
            <label className="check-field">
              <input
                checked={useSpineAfterStop}
                type="checkbox"
                onChange={(event) => setUseSpineAfterStop(event.target.checked)}
              />
              <span>Spine after stop</span>
            </label>
            <label className="check-field">
              <input
                checked={showEnvironment}
                type="checkbox"
                onChange={(event) => setShowEnvironment(event.target.checked)}
              />
              <span>Stage look</span>
            </label>

            {pool.length > 1 ? (
              <div className="reel-lab__pool-chips">
                {pool.map((item) => {
                  const on =
                    allowedIds === null
                      ? true
                      : allowedIds.length === 0
                        ? false
                        : allowedIds.includes(item.id)
                  return (
                    <button
                      key={item.id}
                      className={on ? 'pool-chip is-on' : 'pool-chip'}
                      type="button"
                      onClick={() => toggleAllowed(item.id)}
                    >
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
          <StageAssetsPanel overrides={stageOverrides} onChange={setStageOverrides} />
        </div>
      ) : null}

      <div className={compareEnabled ? 'quality-compare' : 'reel-lab__stage'}>
        <DeviceViewport
          density={reportA.density}
          device={device}
          qualityLabel={compareEnabled ? `A · ${quality.label}` : quality.label}
        >
          <ReelBoardCanvas
            {...sharedBoardProps}
            resolutionScale={reportA.resolutionScale}
            onError={setError}
            onGridChange={setGridAndNotify}
            onSpinningChange={setSpinning}
          />
          {showEnvironment ? (
            <SlotHudShell
              orientation={device.orientation}
              spinning={spinning}
              urls={stageUrls}
              onSpinClick={canSpin ? () => setSpinNonce((value) => value + 1) : undefined}
            />
          ) : null}
        </DeviceViewport>

        {compareEnabled ? (
          <DeviceViewport
            density={reportB.density}
            device={device}
            qualityLabel={`B · ${compareQuality.label}`}
          >
            <ReelBoardCanvas
              {...sharedBoardProps}
              resolutionScale={reportB.resolutionScale}
              onError={setError}
              onGridChange={() => undefined}
              onSpinningChange={setSpinningB}
            />
            {showEnvironment ? (
              <SlotHudShell
                orientation={device.orientation}
                spinning={spinningB}
                urls={stageUrls}
              />
            ) : null}
          </DeviceViewport>
        ) : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  )
}
