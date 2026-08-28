import type { SpineAssetSource } from '../../types'

type SymbolInfoCardProps = {
  source: SpineAssetSource | null
  error: string | null
}

export function SymbolInfoCard({ source, error }: SymbolInfoCardProps) {
  if (error) {
    return (
      <section className="panel-block panel-block--alert">
        <h2>Load error</h2>
        <p>{error}</p>
      </section>
    )
  }

  if (!source) {
    return (
      <section className="panel-block">
        <h2>Symbol</h2>
        <p className="muted">Nothing selected.</p>
      </section>
    )
  }

  const title = source.kind === 'catalog' ? source.symbolId : source.label
  const kind = source.kind === 'catalog' ? 'Catalog' : 'Custom upload'

  return (
    <section className="panel-block" aria-labelledby="symbol-info-title">
      <div className="panel-block__head">
        <h2 id="symbol-info-title">{title}</h2>
        <p>{kind}</p>
      </div>
      <ul className="spec-list">
        <li>
          <span>Texture</span>
          <strong>{source.textureFileName}</strong>
        </li>
        <li>
          <span>Expected clips</span>
          <strong>idle · stop · activation</strong>
        </li>
        <li>
          <span>Export</span>
          <strong>Spine 4.2 · JSON + atlas + webp</strong>
        </li>
      </ul>
    </section>
  )
}
