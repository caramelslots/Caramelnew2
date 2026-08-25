import type { QualityReport } from '../../stage/qualityLab'

type QualityHintCardProps = {
  report: QualityReport
}

export function QualityHintCard({ report }: QualityHintCardProps) {
  return (
    <div className={`quality-hint quality-report--${report.verdict}`}>
      <div className="quality-report__top">
        <span className={`verdict-badge verdict-badge--${report.verdict}`}>
          {report.verdictLabel}
        </span>
      </div>
      <p className="quality-hint__copy">{report.hint}</p>
      <p className="quality-hint__copy">
        dens <strong>{report.resolutionScale.toFixed(2)}×</strong>
        {' · '}
        glyph ≈ {report.glyphCssPx.toFixed(0)}px
      </p>
    </div>
  )
}
