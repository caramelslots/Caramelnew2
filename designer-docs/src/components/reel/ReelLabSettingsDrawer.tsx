import { useEffect, useId, useRef } from 'react'
import type { LibrarySymbol } from '../../library/types'
import {
  MIN_BOARD_COLS,
  MIN_BOARD_ROWS,
  clampBoardDim,
  type BoardDimensions,
} from '../../reel/constants'
import type { DevicePresetId, QualityPresetId } from '../../stage/presets'
import { DEVICE_PRESETS, QUALITY_PRESETS } from '../../stage/presets'
import type { StagePackOverrides } from '../../stage/stagePack'
import { StageAssetsPanel } from '../stage/StageAssetsPanel'

type ReelLabSettingsDrawerProps = {
  open: boolean
  board: BoardDimensions
  deviceId: DevicePresetId
  qualityId: QualityPresetId
  pool: LibrarySymbol[]
  allowedIds: string[] | null
  stageOverrides: StagePackOverrides
  onClose: () => void
  onBoardChange: (board: BoardDimensions) => void
  onDeviceChange: (id: DevicePresetId) => void
  onQualityChange: (id: QualityPresetId) => void
  onToggleAllowed: (id: string) => void
  onStageOverridesChange: (next: StagePackOverrides) => void
}

export function ReelLabSettingsDrawer({
  open,
  board,
  deviceId,
  qualityId,
  pool,
  allowedIds,
  stageOverrides,
  onClose,
  onBoardChange,
  onDeviceChange,
  onQualityChange,
  onToggleAllowed,
  onStageOverridesChange,
}: ReelLabSettingsDrawerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLElement>('button, select, input')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="reel-settings">
      <button
        aria-label="Close settings"
        className="reel-settings__backdrop"
        type="button"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        aria-labelledby={titleId}
        aria-modal="true"
        className="reel-settings__panel"
        role="dialog"
      >
        <header className="reel-settings__head">
          <div>
            <p className="eyebrow">Reel Lab</p>
            <h2 id={titleId}>Settings</h2>
          </div>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="reel-settings__body">
          <section className="reel-settings__section">
            <h3>Viewport</h3>
            <label className="field">
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
            <label className="field">
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
          </section>

          <section className="reel-settings__section">
            <h3>Board</h3>
            <div className="reel-settings__row">
              <BoardDimStepper
                label="Cols"
                min={MIN_BOARD_COLS}
                value={board.cols}
                onChange={(cols) => onBoardChange({ ...board, cols })}
              />
              <BoardDimStepper
                label="Rows"
                min={MIN_BOARD_ROWS}
                value={board.rows}
                onChange={(rows) => onBoardChange({ ...board, rows })}
              />
            </div>
          </section>

          {pool.length > 1 ? (
            <section className="reel-settings__section">
              <h3>Symbols on reel</h3>
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
                      onClick={() => onToggleAllowed(item.id)}
                    >
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          <section className="reel-settings__section reel-settings__section--assets">
            <StageAssetsPanel overrides={stageOverrides} onChange={onStageOverridesChange} />
          </section>
        </div>
      </aside>
    </div>
  )
}

function BoardDimStepper({
  label,
  value,
  min,
  onChange,
}: {
  label: string
  value: number
  min: number
  onChange: (next: number) => void
}) {
  const step = (delta: number) => {
    onChange(clampBoardDim(value + delta, min))
  }

  return (
    <div className="field board-dim-stepper">
      <span>{label}</span>
      <div className="board-dim-stepper__control">
        <span className="board-dim-stepper__value">{value}</span>
        <div className="board-dim-stepper__arrows">
          <button
            aria-label={`${label} +1`}
            className="board-dim-stepper__btn"
            type="button"
            onClick={() => step(1)}
          >
            ▲
          </button>
          <button
            aria-label={`${label} −1`}
            className="board-dim-stepper__btn"
            disabled={value <= min}
            type="button"
            onClick={() => step(-1)}
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  )
}
