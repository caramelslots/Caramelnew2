import type { SymbolListEntry } from '../../types'

type SymbolListPanelProps = {
  entries: SymbolListEntry[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function SymbolListPanel({ entries, selectedId, onSelect }: SymbolListPanelProps) {
  const catalog = entries.filter((entry) => entry.kind === 'catalog')
  const uploads = entries.filter((entry) => entry.kind === 'upload')

  return (
    <section className="panel-block" aria-labelledby="symbol-list-title">
      <div className="panel-block__head">
        <h2 id="symbol-list-title">Symbols</h2>
        <p>Catalog + your uploads</p>
      </div>

      <ul className="symbol-list">
        {catalog.map((entry) => {
          const active = selectedId === entry.id
          return (
            <li key={entry.id}>
              <button
                aria-current={active ? 'true' : undefined}
                className={active ? 'symbol-list__item is-active' : 'symbol-list__item'}
                type="button"
                onClick={() => onSelect(entry.id)}
              >
                <span className="symbol-list__label">{entry.label}</span>
                <span className="symbol-list__meta">{entry.meta}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {uploads.length > 0 ? (
        <>
          <p className="symbol-list__section">Uploads</p>
          <ul className="symbol-list">
            {uploads.map((entry) => {
              const active = selectedId === entry.id
              return (
                <li key={entry.id}>
                  <button
                    aria-current={active ? 'true' : undefined}
                    className={active ? 'symbol-list__item is-active' : 'symbol-list__item'}
                    type="button"
                    onClick={() => onSelect(entry.id)}
                  >
                    <span className="symbol-list__label">{entry.label}</span>
                    <span className="symbol-list__meta">{entry.meta}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </section>
  )
}
