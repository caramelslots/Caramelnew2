import { readinessLabel, type LibrarySymbol } from '../../library/types'

type SymbolLibraryPanelProps = {
  symbols: LibrarySymbol[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove?: (id: string) => void
}

export function SymbolLibraryPanel({
  symbols,
  selectedId,
  onSelect,
  onRemove,
}: SymbolLibraryPanelProps) {
  const catalog = symbols.filter((item) => item.kind === 'catalog')
  const uploads = symbols.filter((item) => item.kind === 'upload')

  return (
    <section className="panel-block" aria-labelledby="symbol-library-title">
      <div className="panel-block__head">
        <h2 id="symbol-library-title">Library</h2>
        <p>Каталог и ваши символы · статус готовности к барабану</p>
      </div>

      {symbols.length === 0 ? (
        <p className="muted">Пока пусто — загрузите static + Spine.</p>
      ) : null}

      {catalog.length > 0 ? (
        <>
          <p className="symbol-list__section">Catalog</p>
          <ul className="library-list">{catalog.map((item) => (
            <LibraryRow
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              onSelect={onSelect}
            />
          ))}</ul>
        </>
      ) : null}

      {uploads.length > 0 ? (
        <>
          <p className="symbol-list__section">Uploads</p>
          <ul className="library-list">
            {uploads.map((item) => (
              <LibraryRow
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}

function LibraryRow({
  item,
  selected,
  onSelect,
  onRemove,
}: {
  item: LibrarySymbol
  selected: boolean
  onSelect: (id: string) => void
  onRemove?: (id: string) => void
}) {
  const badge = readinessLabel(item.status.readiness)
  return (
    <li>
      <div className={selected ? 'library-row is-active' : 'library-row'}>
        <button
          aria-current={selected ? 'true' : undefined}
          className="library-row__main"
          type="button"
          onClick={() => onSelect(item.id)}
        >
          <span className="library-row__thumb" aria-hidden="true">
            {item.thumbUrl ? (
              <img alt="" src={item.thumbUrl} />
            ) : (
              <span className="library-row__thumb-empty">?</span>
            )}
          </span>
          <span className="library-row__text">
            <span className="library-row__label">{item.label}</span>
            <span className="library-row__meta">
              {item.staticSprite
                ? `${item.staticSprite.width}×${item.staticSprite.height}`
                : 'no static'}
              {item.status.spineOk ? ' · spine' : ' · no spine'}
            </span>
          </span>
          <span
            className={`status-badge status-badge--${item.status.readiness}`}
            title={item.status.warnings.join('\n') || undefined}
          >
            {badge}
          </span>
        </button>
        {onRemove && item.kind === 'upload' ? (
          <button
            aria-label={`Remove ${item.label}`}
            className="library-row__remove"
            type="button"
            onClick={() => onRemove(item.id)}
          >
            ×
          </button>
        ) : null}
      </div>
      {selected && item.status.warnings.length > 0 ? (
        <ul className="library-warnings">
          {item.status.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}
