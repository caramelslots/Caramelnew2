import { useMemo, useState } from 'react'
import type { LibrarySymbol } from '../../library/types'
import {
  DEFAULT_BOARD_COLS,
  DEFAULT_BOARD_ROWS,
  MIN_BOARD_COLS,
  MIN_BOARD_ROWS,
  boardPixelSize,
  clampBoardDim,
  type BoardDimensions,
} from '../../reel/constants'
import { readyStaticSymbols, type BoardGrid } from '../../reel/fillBoard'
import { ReelBoardCanvas } from '../../reel/ReelBoardCanvas'
import {
  DEVICE_PRESETS,
  QUALITY_PRESETS,
  qualityScaleForFrame,
  type DevicePresetId,
  type QualityPresetId,
} from '../../stage/presets'

type ReelLabStageProps = {
  symbols: LibrarySymbol[]
  board: BoardDimensions
  deviceId: DevicePresetId
  qualityId: QualityPresetId
  onBoardChange: (board: BoardDimensions) => void
  onDeviceChange: (id: DevicePresetId) => void
  onQualityChange: (id: QualityPresetId) => void
}

export function ReelLabStage({
  symbols,
  board,
  deviceId,
  qualityId,
  onBoardChange,
  onDeviceChange,
  onQualityChange,
}: ReelLabStageProps) {
  const device = DEVICE_PRESETS.find((item) => item.id === deviceId) ?? DEVICE_PRESETS[0]!
  const quality = QUALITY_PRESETS.find((item) => item.id === qualityId) ?? QUALITY_PRESETS[2]!
  const boardPx = boardPixelSize(board)
  const density = qualityScaleForFrame(device.width, device.height, quality)
  const staticReady = readyStaticSymbols(symbols).length

  const [spinNonce, setSpinNonce] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [grid, setGrid] = useState<BoardGrid | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resolutionScale = useMemo(
    () => Math.max(0.35, Math.min(density, 2.5)),
    [density],
  )

  const canSpin = staticReady > 0 && !spinning

  return (
    <div className="reel-lab">
      <div className="reel-lab__toolbar">
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

        <button
          className="btn btn--primary"
          disabled={!canSpin}
          type="button"
          onClick={() => setSpinNonce((value) => value + 1)}
        >
          {spinning ? 'Spinning…' : 'Spin'}
        </button>
      </div>

      <div className="reel-lab__viewport-wrap">
        <div
          className="device-frame"
          style={{
            width: `min(100%, ${device.width}px)`,
            aspectRatio: `${device.width} / ${device.height}`,
          }}
        >
          <div className="device-frame__chrome">
            <span>
              {device.label} · {device.width}×{device.height}
            </span>
            <span>
              {quality.label} · dens {density.toFixed(2)}×
            </span>
          </div>
          <div className="device-frame__stage device-frame__stage--live">
            <ReelBoardCanvas
              board={board}
              library={symbols}
              resolutionScale={resolutionScale}
              spinNonce={spinNonce}
              onError={setError}
              onGridChange={setGrid}
              onSpinningChange={setSpinning}
            />
          </div>
        </div>
      </div>

      <div className="reel-lab__footer">
        <p className="muted">
          Board {board.cols}×{board.rows} · design {boardPx.width}×{boardPx.height} · default{' '}
          {DEFAULT_BOARD_COLS}×{DEFAULT_BOARD_ROWS} · static ready {staticReady}
          {grid ? ` · last stop ${grid.length}×${grid[0]?.length ?? 0}` : ''}
        </p>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </div>
  )
}
