import type { LibrarySymbol } from '../../library/types'
import { readinessLabel } from '../../library/types'
import type { BoardDimensions } from '../../reel/constants'
import type { BoardGrid } from '../../reel/fillBoard'
import { REEL_SPEED_LABEL } from '../../reel/spinOptions'
import type { QualityReport } from '../../stage/qualityLab'
import type { DevicePresetId, QualityPresetId } from '../../stage/presets'

type ReelInspectPanelProps = {
  library: LibrarySymbol[]
  selected: LibrarySymbol | null
  board: BoardDimensions
  deviceId: DevicePresetId
  qualityId: QualityPresetId
  grid: BoardGrid | null
  qualityReport: QualityReport | null
  spineBudget: number
  onSelectSymbol: (id: string) => void
  onQuickScenario: (scenario: QuickScenarioId) => void
}

export type QuickScenarioId =
  | 'desktop-1080'
  | 'popout-720'
  | 'mobile-1080'
  | 'compare-4k-720'

export function ReelInspectPanel({
  library,
  selected,
  board,
  deviceId,
  qualityId,
  grid,
  qualityReport,
  spineBudget,
  onSelectSymbol,
  onQuickScenario,
}: ReelInspectPanelProps) {
  const ready = library.filter((item) => item.status.readiness === 'ready').length
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
        <ul className="inspect-list">
          <li>
            Ready <strong>{ready}</strong> / {library.length}
          </li>
          <li>
            Spine budget <strong>{spineBudget}</strong>
          </li>
          <li>
            Scroll <strong>{REEL_SPEED_LABEL}</strong>
          </li>
          {grid ? (
            <li>
              Last stop{' '}
              <strong>
                {grid.length}×{grid[0]?.length ?? 0}
              </strong>
            </li>
          ) : null}
        </ul>

        {qualityReport ? (
          <div className={`quality-report quality-report--${qualityReport.verdict}`}>
            <div className="quality-report__top">
              <span className={`verdict-badge verdict-badge--${qualityReport.verdict}`}>
                {qualityReport.verdictLabel}
              </span>
            </div>
            <p className="quality-hint__copy">
              dens {qualityReport.resolutionScale.toFixed(2)}× · glyph ≈{' '}
              {qualityReport.glyphCssPx.toFixed(0)}px
            </p>
          </div>
        ) : null}

        <div className="quick-scenarios">
          <p className="quick-scenarios__label">Presets</p>
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
            <button
              className="btn"
              type="button"
              onClick={() => onQuickScenario('compare-4k-720')}
            >
              A/B
            </button>
          </div>
        </div>
      </section>

      <section className="panel-block">
        <div className="panel-block__head">
          <h2>{selected?.label ?? 'Symbol'}</h2>
          <p>{selected ? readinessLabel(selected.status.readiness) : 'Выберите в Library'}</p>
        </div>
        {selected ? (
          <>
            <ul className="inspect-list">
              <li>
                Static{' '}
                <strong>
                  {selected.staticSprite
                    ? `${selected.staticSprite.width}×${selected.staticSprite.height}`
                    : '—'}
                </strong>
              </li>
              <li>
                Clips{' '}
                <strong>
                  {selected.roles?.idle ?? '—'} / {selected.roles?.bounce ?? '—'} /{' '}
                  {selected.roles?.win ?? '—'}
                </strong>
              </li>
            </ul>
            {selected.status.warnings.length > 0 ? (
              <ul className="library-warnings">
                {selected.status.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
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

      <details className="panel-block howto-details">
        <summary>Как пользоваться</summary>
        <ol className="howto-steps">
          <li>
            <strong>Upload</strong> static 196 + Spine
          </li>
          <li>
            <strong>Spin</strong> в Reel Lab
          </li>
          <li>
            <strong>Device / Quality</strong> сверху
          </li>
          <li>
            <strong>A/B</strong> — сравнить качество
          </li>
        </ol>
      </details>
    </div>
  )
}
