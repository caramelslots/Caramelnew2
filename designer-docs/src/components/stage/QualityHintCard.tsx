import type { QualityReport } from '../../stage/qualityLab'

type QualityHintCardProps = {
  report: QualityReport
  compareReport?: QualityReport | null
  deviceLabel: string
}

export function QualityHintCard({
  report,
  compareReport,
  deviceLabel,
}: QualityHintCardProps) {
  return (
    <div className="quality-hint">
      <div className="quality-hint__head">
        <strong>Quality lab</strong>
        <span className="muted">{deviceLabel}</span>
      </div>

      <div className="quality-hint__cards">
        <ReportBlock report={report} tag={compareReport ? 'A' : undefined} />
        {compareReport ? <ReportBlock report={compareReport} tag="B" /> : null}
      </div>

      <p className="quality-hint__copy">{report.hint}</p>
      {compareReport ? (
        <p className="quality-hint__copy quality-hint__copy--b">{compareReport.hint}</p>
      ) : null}
    </div>
  )
}

function ReportBlock({ report, tag }: { report: QualityReport; tag?: string }) {
  return (
    <div className={`quality-report quality-report--${report.verdict}`}>
      <div className="quality-report__top">
        {tag ? <span className="quality-report__tag">{tag}</span> : null}
        <span className={`verdict-badge verdict-badge--${report.verdict}`}>
          {report.verdictLabel}
        </span>
      </div>
      <ul>
        <li>
          dens <strong>{report.resolutionScale.toFixed(2)}×</strong>
        </li>
        <li>
          glyph ≈ <strong>{report.glyphCssPx.toFixed(0)}px</strong>
        </li>
        <li>
          196 → <strong>{report.texelsPerCssPx.toFixed(2)}</strong> tex/px
        </li>
      </ul>
    </div>
  )
}
