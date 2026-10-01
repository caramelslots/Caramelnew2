import { useId, useState } from 'react'
import {
  HUD_GUIDE_EXAMPLES,
  HUD_SPEC_ROWS,
} from '../../catalog/hudSpecs'
import { GuideSpinPreview, HudSpinNestedAccordion } from './SpinGuideAccordion'

type HudSectionId = 'format' | 'sizes' | 'spin'

const HUD_SECTIONS: { id: HudSectionId; title: string; summary: string }[] = [
  {
    id: 'format',
    title: 'Формат — WebP',
    summary: 'Turbo, spin, bet ±, menu, info, autoplay mobile',
  },
  {
    id: 'sizes',
    title: 'Пиковые размеры',
    summary: '184² / 368² — все HUD элементы включая spin',
  },
  {
    id: 'spin',
    title: 'Spin (кнопка спина)',
    summary: 'Spine press + spin_1 / spin_2 · designer_assets/spin',
  },
]

export function HudGuideAccordion() {
  const baseId = useId()
  const [hudOpen, setHudOpen] = useState(false)
  const [openId, setOpenId] = useState<HudSectionId | null>(null)

  const toggleInner = (id: HudSectionId) => {
    setOpenId((current) => (current === id ? null : id))
  }

  const panelId = `${baseId}-hud-panel`
  const btnId = `${baseId}-hud-btn`
  const showSpinPreview = hudOpen && openId === 'spin'

  return (
    <div className={hudOpen ? 'accordion__item is-open' : 'accordion__item'}>
      <h3 className="accordion__heading">
        <button
          aria-controls={panelId}
          aria-expanded={hudOpen}
          className="accordion__trigger"
          id={btnId}
          type="button"
          onClick={() => setHudOpen((open) => !open)}
        >
          <span className="accordion__title">HUD элементы</span>
          <span className="accordion__hint">
            Turbo, spin, bet ±, menu, info, autoplay mobile
          </span>
          <span aria-hidden="true" className="accordion__chevron" />
        </button>
      </h3>

      <div
        aria-labelledby={btnId}
        className="accordion__panel"
        id={panelId}
        hidden={!hudOpen}
        role="region"
      >
        <div className="guide-symbols">
          <div className="guide-symbols__docs">
            <div className="accordion accordion--nested">
              {HUD_SECTIONS.map((section) => {
                const isOpen = openId === section.id
                const innerPanelId = `${baseId}-${section.id}-panel`
                const innerBtnId = `${baseId}-${section.id}-btn`

                return (
                  <div
                    className={isOpen ? 'accordion__item is-open' : 'accordion__item'}
                    key={section.id}
                  >
                    <h4 className="accordion__heading">
                      <button
                        aria-controls={innerPanelId}
                        aria-expanded={isOpen}
                        className="accordion__trigger"
                        id={innerBtnId}
                        type="button"
                        onClick={() => toggleInner(section.id)}
                      >
                        <span className="accordion__title">{section.title}</span>
                        <span className="accordion__hint">{section.summary}</span>
                        <span aria-hidden="true" className="accordion__chevron" />
                      </button>
                    </h4>

                    <div
                      aria-labelledby={innerBtnId}
                      className="accordion__panel"
                      id={innerPanelId}
                      hidden={!isOpen}
                      role="region"
                    >
                      {section.id === 'format' ? <HudFormatSection /> : null}
                      {section.id === 'sizes' ? <HudSizesSection /> : null}
                      {section.id === 'spin' ? (
                        <HudSpinNestedAccordion baseId={baseId} />
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <aside className="guide-symbols__preview">
            {showSpinPreview ? (
              <GuideSpinPreview />
            ) : (
              <GuideHudPreview />
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function HudFormatSection() {
  return (
    <div className="guide-copy">
      <p>
        Все HUD-элементы — <strong>WebP</strong>. Turbo: <code>turbo_1…3.webp</code>.
      </p>
    </div>
  )
}

function HudSizesSection() {
  return (
    <div className="guide-copy">
      <div className="naming-table-wrap">
        <table className="naming-table">
          <thead>
            <tr>
              <th>Элемент</th>
              <th>Пик (WebP)</th>
              <th>На экране</th>
              <th>Файлы</th>
            </tr>
          </thead>
          <tbody>
            {HUD_SPEC_ROWS.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.label}</strong>
                  {row.notes ? <p className="hud-spec-note">{row.notes}</p> : null}
                </td>
                <td>
                  <code>{row.peak}</code>
                </td>
                <td>{row.onScreen}</td>
                <td>
                  <code>{row.files}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GuideHudPreview() {
  return (
    <div className="guide-preview guide-preview--hud">
      <div className="guide-preview__head">
        <div>
          <p className="guide-preview__id">HUD</p>
          <p className="guide-preview__name">Util-иконки</p>
        </div>
        <p className="muted">WebP</p>
      </div>

      <div className="guide-hud-examples">
        {HUD_GUIDE_EXAMPLES.map((example) => (
          <div className="guide-hud-example" key={example.id}>
            <div className="guide-hud-example__head">
              <p className="guide-hud-example__title">{example.title}</p>
              <p className="muted">
                {example.file} · {example.peakLabel}
              </p>
            </div>
            <div className="guide-hud-example__frame guide-hud-example__frame--square">
              <img
                alt={`${example.title} HUD example`}
                className="guide-hud-example__img"
                height={example.displayPx}
                src={example.url}
                width={example.displayPx}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
