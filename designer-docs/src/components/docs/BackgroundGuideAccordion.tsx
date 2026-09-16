import { useId, useState } from 'react'
import {
  BACKGROUND_FOLDER_ROWS,
  BACKGROUND_IDLE_CLIP,
  BACKGROUND_PLATE_NATIVE,
  BACKGROUND_STATIC_HEIGHT,
  BACKGROUND_STATIC_WIDTH,
  GUIDE_BACKGROUND_SPINE_PACK,
  GUIDE_BACKGROUND_STATIC_URL,
} from '../../catalog/backgroundSpecs'
import { BackgroundPreviewModal } from './BackgroundPreviewModal'

type BgSectionId = 'structure' | 'format' | 'sizes' | 'animation'

const BG_SECTIONS: { id: BgSectionId; title: string; summary: string }[] = [
  {
    id: 'structure',
    title: 'Структура папки',
    summary: 'Как сдавать background — пример designer_assets/background',
  },
  {
    id: 'format',
    title: 'Формат — WebP',
    summary: 'Static + текстуры Spine только WebP',
  },
  {
    id: 'sizes',
    title: 'Размеры',
    summary: 'Static 1920×1080, atlas pages 2048²',
  },
  {
    id: 'animation',
    title: 'Анимация',
    summary: 'Idle loop в Spine',
  },
]

export function BackgroundGuideAccordion() {
  const baseId = useId()
  const [bgOpen, setBgOpen] = useState(false)
  const [openId, setOpenId] = useState<BgSectionId | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const toggleInner = (id: BgSectionId) => {
    setOpenId((current) => (current === id ? null : id))
  }

  const panelId = `${baseId}-bg-panel`
  const btnId = `${baseId}-bg-btn`

  return (
    <>
      <div className={bgOpen ? 'accordion__item is-open' : 'accordion__item'}>
        <h3 className="accordion__heading">
          <button
            aria-controls={panelId}
            aria-expanded={bgOpen}
            className="accordion__trigger"
            id={btnId}
            type="button"
            onClick={() => setBgOpen((open) => !open)}
          >
            <span className="accordion__title">Background (задний фон)</span>
            <span className="accordion__hint">
              WebP + Spine, static 1920×1080, пример в designer_assets/background
            </span>
            <span aria-hidden="true" className="accordion__chevron" />
          </button>
        </h3>

        <div
          aria-labelledby={btnId}
          className="accordion__panel"
          id={panelId}
          hidden={!bgOpen}
          role="region"
        >
          <div className="guide-bg">
            <div className="guide-bg__docs">
              <div className="accordion accordion--nested">
                {BG_SECTIONS.map((section) => {
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
                        {section.id === 'structure' ? <BgStructureSection /> : null}
                        {section.id === 'format' ? <BgFormatSection /> : null}
                        {section.id === 'sizes' ? <BgSizesSection /> : null}
                        {section.id === 'animation' ? <BgAnimationSection /> : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <aside className="guide-bg__aside">
              <div className="guide-bg-preview-card">
                <p className="guide-bg-preview-card__label">Эталон</p>
                <p className="guide-bg-preview-card__title">designer_assets/background</p>
                <p className="muted">
                  Spine street + static still · {BACKGROUND_STATIC_WIDTH}×
                  {BACKGROUND_STATIC_HEIGHT}
                </p>
                <div className="guide-bg-preview-card__thumb">
                  <img
                    alt="Background static thumbnail"
                    className="guide-bg-preview-card__img"
                    src={GUIDE_BACKGROUND_STATIC_URL}
                  />
                </div>
                <button
                  className="btn btn--primary guide-bg-preview-card__btn"
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                >
                  Посмотреть пример фона
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <BackgroundPreviewModal
        open={previewOpen}
        spinePack={GUIDE_BACKGROUND_SPINE_PACK}
        staticUrl={GUIDE_BACKGROUND_STATIC_URL}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  )
}

function BgStructureSection() {
  return (
    <div className="guide-copy">
      <div className="guide-tree" aria-label="Структура папки background">
        <p className="guide-tree__root">
          <span className="guide-tree__icon" aria-hidden="true">
            📁
          </span>
          <code>background/</code>
        </p>
        <ul className="guide-tree__list">
          {BACKGROUND_FOLDER_ROWS.map((row) => (
            <li className="guide-tree__item" key={row.file}>
              <code>{row.file}</code>
              <span className="guide-tree__role">{row.role}</span>
              <span className="guide-tree__note">{row.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function BgFormatSection() {
  return (
    <div className="guide-copy">
      <p>Static и atlas pages — <strong>WebP</strong>. Spine 4.2.</p>
    </div>
  )
}

function BgSizesSection() {
  const plateW = Math.round(BACKGROUND_PLATE_NATIVE.width)
  const plateH = Math.round(BACKGROUND_PLATE_NATIVE.height)

  return (
    <div className="guide-copy">
      <div className="naming-table-wrap">
        <table className="naming-table">
          <thead>
            <tr>
              <th>Файл</th>
              <th>Размер (WebP)</th>
              <th>Назначение</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>background_static.webp</code>
              </td>
              <td>
                <strong>
                  {BACKGROUND_STATIC_WIDTH}×{BACKGROUND_STATIC_HEIGHT}
                </strong>
              </td>
              <td>Still / loading fallback</td>
            </tr>
            <tr>
              <td>
                <code>background.webp</code>, <code>background_2.webp</code>
              </td>
              <td>
                <strong>2048×2048</strong>
              </td>
              <td>Atlas pages (multi-page)</td>
            </tr>
            <tr>
              <td>
                <code>background_3.webp</code>
              </td>
              <td>
                <strong>2048×1024</strong>
              </td>
              <td>Atlas page 3</td>
            </tr>
            <tr>
              <td>Spine plate (layout)</td>
              <td>
                ≈ <strong>{plateW}×{plateH}</strong>
              </td>
              <td>Cover-scale bounds в игре</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BgAnimationSection() {
  return (
    <div className="guide-copy">
      <p>
        Idle loop в Spine. Эталонный клип: <code>{BACKGROUND_IDLE_CLIP}</code>.
      </p>
    </div>
  )
}
