import type { LibrarySymbol } from '../../library/types'
import type { BoardDimensions } from '../../reel/constants'
import type { BoardGrid } from '../../reel/fillBoard'
import type { DevicePresetId, QualityPresetId } from '../../stage/presets'
import { QualityPicker } from '../stage/QualityPicker'

type ReelInspectPanelProps = {
  library: LibrarySymbol[]
  board: BoardDimensions
  deviceId: DevicePresetId
  qualityId: QualityPresetId
  grid: BoardGrid | null
  onSelectSymbol: (id: string) => void
  onQuickScenario: (scenario: QuickScenarioId) => void
  onQualityChange: (id: QualityPresetId) => void
}

export type QuickScenarioId = 'desktop-1080' | 'popout-720' | 'mobile-1080'

export function ReelInspectPanel({
  library,
  board,
  deviceId,
  qualityId,
  grid,
  onSelectSymbol,
  onQuickScenario,
  onQualityChange,
}: ReelInspectPanelProps) {
  const withWarnings = library.filter((item) => item.status.warnings.length > 0)

  return (
    <div className="reel-inspect">
      <section className="panel-block">
        <div className="panel-block__head">
          <h2>Inspect</h2>
          <p>
            {board.cols}×{board.rows} · {deviceId} · {qualityId}
          </p>
        </div>
        {grid ? (
          <ul className="inspect-list">
            <li>
              Last stop{' '}
              <strong>
                {grid.length}×{grid[0]?.length ?? 0}
              </strong>
            </li>
          </ul>
        ) : null}

        <div className="quick-scenarios">
          <p className="quick-scenarios__label">Device</p>
          <div className="quick-scenarios__row">
            <button className="btn" type="button" onClick={() => onQuickScenario('desktop-1080')}>
              Desktop
            </button>
            <button className="btn" type="button" onClick={() => onQuickScenario('popout-720')}>
              Popout
            </button>
            <button className="btn" type="button" onClick={() => onQuickScenario('mobile-1080')}>
              Mobile
            </button>
          </div>
          <p className="quick-scenarios__label">Quality</p>
          <QualityPicker value={qualityId} onChange={onQualityChange} />
        </div>
      </section>

      {withWarnings.length > 0 ? (
        <section className="panel-block panel-block--alert">
          <div className="panel-block__head">
            <h2>Warnings</h2>
            <p>{withWarnings.length}</p>
          </div>
          <ul className="warning-symbol-list">
            {withWarnings.slice(0, 5).map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onSelectSymbol(item.id)}>
                  <strong>{item.label}</strong>
                  <span>{item.status.warnings[0]}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
