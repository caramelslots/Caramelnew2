import type { SpineMetrics } from '../../types'
import { formatBytes } from '../../pixi/useSpineMetrics'

type MetricsPanelProps = {
  metrics: SpineMetrics | null
  loading: boolean
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function MetricsPanel({ metrics, loading }: MetricsPanelProps) {
  return (
    <section className="panel-block" aria-labelledby="metrics-title">
      <div className="panel-block__head">
        <h2 id="metrics-title">Optimization</h2>
        <p>Frame budget and texture footprint</p>
      </div>

      {loading ? <p className="muted">Loading metrics…</p> : null}

      {!loading && !metrics ? <p className="muted">Select or upload a symbol.</p> : null}

      {metrics ? (
        <>
          <dl className="metric-list">
            <MetricRow label="Clip" value={metrics.animationName ?? '—'} />
            <MetricRow label="Duration" value={`${metrics.durationSec.toFixed(3)} s`} />
            <MetricRow label="Frames @ 30fps" value={String(metrics.framesAt30)} />
            <MetricRow label="Frames @ 60fps" value={String(metrics.framesAt60)} />
            <MetricRow label="Timeline keys" value={String(metrics.timelineKeys)} />
            <MetricRow label="Bones" value={String(metrics.boneCount)} />
            <MetricRow label="Slots" value={String(metrics.slotCount)} />
            <MetricRow label="Attachments" value={String(metrics.attachmentCount)} />
            <MetricRow label="Atlas regions" value={String(metrics.atlasRegionCount)} />
            <MetricRow
              label="Texture"
              value={
                metrics.textureWidth
                  ? `${metrics.textureWidth}×${metrics.textureHeight} (${metrics.textureFormat})`
                  : '—'
              }
            />
            <MetricRow
              label="Approx RGBA"
              value={formatBytes(metrics.textureApproxBytes)}
            />
          </dl>

          {metrics.warnings.length > 0 ? (
            <ul className="warn-list">
              {metrics.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="ok-note">No threshold warnings for this clip/texture.</p>
          )}
        </>
      ) : null}
    </section>
  )
}
