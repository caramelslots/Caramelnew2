import type { LibrarySymbol } from '../../library/types'
import type { SpineAssetSource } from '../../types'

type SymbolInfoCardProps = {
  source: SpineAssetSource | null
  selected: LibrarySymbol | null
  error: string | null
}

export function SymbolInfoCard({ source, selected, error }: SymbolInfoCardProps) {
  if (!selected) {
    return (
      <section className="panel-block">
        <h2>Symbol</h2>
        <p className="muted">Nothing selected.</p>
      </section>
    )
  }

  const title = selected.label
  const kind = selected.kind === 'catalog' ? 'Catalog' : 'Upload'

  return (
    <section className="panel-block" aria-labelledby="symbol-info-title">
      <div className="panel-block__head">
        <h2 id="symbol-info-title">{title}</h2>
        <p>{kind}</p>
      </div>
      {error ? (
        <p className="form-error" style={{ marginBottom: 8 }}>
          Spine: {error}
        </p>
      ) : null}
      {source ? (
        <ul className="spec-list">
          <li>
            <span>Texture</span>
            <strong>{source.textureFileName}</strong>
          </li>
          <li>
            <span>Клипы</span>
            <strong>idle · stop · activation</strong>
          </li>
          <li>
            <span>Static</span>
            <strong>
              {selected.staticSprite
                ? `${selected.staticSprite.width}×${selected.staticSprite.height} ${selected.staticSprite.format}`
                : 'нет'}
            </strong>
          </li>
        </ul>
      ) : (
        <p className="muted">Spine-пакет не загружен.</p>
      )}
    </section>
  )
}
