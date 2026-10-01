import { useCallback, useId, useState } from 'react'
import { BackgroundGuideAccordion } from './BackgroundGuideAccordion'
import { HudGuideAccordion } from './HudGuideAccordion'
import { AnimationControls } from '../symbols/AnimationControls'
import { SpinePreviewStage } from '../../pixi/SpinePreviewStage'
import type {
  AnimationRole,
  AnimationRoleMap,
  PlaybackState,
  SpineAssetSource,
  SpineMetrics,
} from '../../types'

/** Docs-only example — not seeded into the symbol library / Reel Lab. */
const GUIDE_H1_SOURCE: SpineAssetSource = {
  kind: 'catalog',
  symbolId: 'H1',
  skeletonUrl: '/designer-assets/H1/H1.json',
  atlasUrl: '/designer-assets/H1/H1.atlas',
  textureUrl: '/designer-assets/H1/H1.webp',
  textureFileName: 'H1.webp',
}

const GUIDE_H1_STATIC_URL = '/designer-assets/H1/H1_static.webp'

type SectionId = 'structure' | 'animations' | 'format' | 'naming' | 'size'

const SECTIONS: { id: SectionId; title: string; summary: string }[] = [
  {
    id: 'structure',
    title: 'Структура папки',
    summary: 'Как сдавать один символ — пример H1',
  },
  {
    id: 'animations',
    title: 'Анимации — idle, stop, activation',
    summary: 'Три обязательных клипа в Spine',
  },
  {
    id: 'format',
    title: 'Формат — WebP',
    summary: 'Статика символа только в WebP',
  },
  {
    id: 'naming',
    title: 'Нейминг — H1–H4 и L1–L4',
    summary: 'High / Low и имена файлов',
  },
  {
    id: 'size',
    title: 'Размер — 196×196 или 392×392',
    summary: 'На барабане всегда 196×196',
  },
]

export function DesignerGuideAccordion() {
  const baseId = useId()
  const [symbolsOpen, setSymbolsOpen] = useState(false)
  const [openId, setOpenId] = useState<SectionId | null>(null)

  const toggleInner = (id: SectionId) => {
    setOpenId((current) => (current === id ? null : id))
  }

  const symbolsPanelId = `${baseId}-symbols-panel`
  const symbolsBtnId = `${baseId}-symbols-btn`

  return (
    <section className="guide" aria-labelledby={`${baseId}-title`}>
      <div className="guide__head">
        <h2 id={`${baseId}-title`}>Документация для дизайнеров</h2>
      </div>

      <div className="accordion">
        <div className={symbolsOpen ? 'accordion__item is-open' : 'accordion__item'}>
          <h3 className="accordion__heading">
            <button
              aria-controls={symbolsPanelId}
              aria-expanded={symbolsOpen}
              className="accordion__trigger"
              id={symbolsBtnId}
              type="button"
              onClick={() => setSymbolsOpen((open) => !open)}
            >
              <span className="accordion__title">Символы</span>
              <span className="accordion__hint">H1 — структура, анимации, формат, размер</span>
              <span aria-hidden="true" className="accordion__chevron" />
            </button>
          </h3>

          <div
            aria-labelledby={symbolsBtnId}
            className="accordion__panel"
            id={symbolsPanelId}
            hidden={!symbolsOpen}
            role="region"
          >
            <div className="guide-symbols">
              <div className="guide-symbols__docs">
                <div className="accordion accordion--nested">
                  {SECTIONS.map((section) => {
                    const isOpen = openId === section.id
                    const panelId = `${baseId}-${section.id}-panel`
                    const buttonId = `${baseId}-${section.id}-btn`

                    return (
                      <div
                        className={
                          isOpen ? 'accordion__item is-open' : 'accordion__item'
                        }
                        key={section.id}
                      >
                        <h4 className="accordion__heading">
                          <button
                            aria-controls={panelId}
                            aria-expanded={isOpen}
                            className="accordion__trigger"
                            id={buttonId}
                            type="button"
                            onClick={() => toggleInner(section.id)}
                          >
                            <span className="accordion__title">{section.title}</span>
                            <span className="accordion__hint">{section.summary}</span>
                            <span aria-hidden="true" className="accordion__chevron" />
                          </button>
                        </h4>

                        <div
                          aria-labelledby={buttonId}
                          className="accordion__panel"
                          id={panelId}
                          hidden={!isOpen}
                          role="region"
                        >
                          {section.id === 'structure' ? <StructureSection /> : null}
                          {section.id === 'animations' ? <AnimationsSection /> : null}
                          {section.id === 'format' ? <FormatSection /> : null}
                          {section.id === 'naming' ? <NamingSection /> : null}
                          {section.id === 'size' ? <SizeSection /> : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <aside className="guide-symbols__preview">
                {symbolsOpen ? <GuideSymbolPreview /> : null}
              </aside>
            </div>
          </div>
        </div>

        <HudGuideAccordion />

        <BackgroundGuideAccordion />
      </div>
    </section>
  )
}

function GuideSymbolPreview() {
  const source = GUIDE_H1_SOURCE
  const staticSpriteUrl = GUIDE_H1_STATIC_URL
  const [animationNames, setAnimationNames] = useState<string[]>([])
  const [roles, setRoles] = useState<AnimationRoleMap>({
    idle: null,
    bounce: null,
    win: null,
  })
  const [playback, setPlayback] = useState<PlaybackState>({
    animationName: null,
    loop: true,
    speed: 1,
    playNonce: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnimationsChange = useCallback((names: string[], nextRoles: AnimationRoleMap) => {
    setAnimationNames(names)
    setRoles(nextRoles)
    const initial = nextRoles.idle ?? nextRoles.bounce ?? nextRoles.win ?? names[0] ?? null
    setPlayback((prev) => ({
      ...prev,
      animationName: initial,
      playNonce: prev.playNonce + 1,
    }))
  }, [])

  const handleMetricsChange = useCallback((_metrics: SpineMetrics | null) => {
    // Guide preview does not surface metrics.
  }, [])

  const handleError = useCallback((message: string | null) => {
    setError(message)
  }, [])

  const handleLoadingChange = useCallback((next: boolean) => {
    setLoading(next)
  }, [])

  const playClip = (animationName: string) => {
    setPlayback((prev) => ({
      ...prev,
      animationName,
      playNonce: prev.playNonce + 1,
    }))
  }

  const playRole = (role: AnimationRole) => {
    const clip = roles[role]
    if (!clip) return
    playClip(clip)
  }

  return (
    <div className="guide-preview">
      <div className="guide-preview__head">
        <div>
          <p className="guide-preview__id">H1</p>
          <p className="guide-preview__name">Пример символа</p>
        </div>
        <p className="muted">{loading ? 'Загрузка…' : error ? 'Ошибка' : 'Preview'}</p>
      </div>

      <div className="guide-preview__stage">
        <SpinePreviewStage
          playback={playback}
          source={source}
          onAnimationsChange={handleAnimationsChange}
          onError={handleError}
          onLoadingChange={handleLoadingChange}
          onMetricsChange={handleMetricsChange}
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <AnimationControls
        activeAnimation={playback.animationName}
        animationNames={animationNames}
        disabled={loading || Boolean(error)}
        embedded
        loop={playback.loop}
        roles={roles}
        speed={playback.speed}
        titleId="guide-anim-controls-title"
        onLoopChange={(loop) => setPlayback((prev) => ({ ...prev, loop }))}
        onPlayRole={playRole}
        onSelectAnimation={playClip}
        onSpeedChange={(speed) => setPlayback((prev) => ({ ...prev, speed }))}
      />

      {staticSpriteUrl ? (
        <div className="guide-static">
          <div className="guide-static__head">
            <p className="guide-static__label">Статика</p>
            <p className="muted">H1_static.webp · 196×196</p>
          </div>
          <div className="guide-static__frame">
            <img
              alt="H1 static sprite"
              className="guide-static__img"
              height={196}
              src={staticSpriteUrl}
              width={196}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StructureSection() {
  const rows = [
    {
      file: 'H1.json',
      role: 'Spine skeleton',
      note: 'Три анимации: idle, stop, activation (см. раздел «Анимации»).',
    },
    {
      file: 'H1.atlas',
      role: 'Spine atlas',
      note: 'В первой строке — имя текстуры атласа: H1.webp.',
    },
    {
      file: 'H1.webp',
      role: 'Текстура Spine-атласа',
      note: 'Кадры анимации. Размер свободный (часто 1024² / 2048²), не путать со static.',
    },
    {
      file: 'H1_static.webp',
      role: 'Static для барабана',
      note: 'Отдельный квадрат 196×196 или 392×392 — показывается при спине.',
    },
  ] as const

  return (
    <div className="guide-copy">
      <div className="guide-tree" aria-label="Структура папки H1">
        <p className="guide-tree__root">
          <span className="guide-tree__icon" aria-hidden="true">
            📁
          </span>
          <code>H1/</code>
        </p>
        <ul className="guide-tree__list">
          {rows.map((row) => (
            <li className="guide-tree__item" key={row.file}>
              <code>{row.file}</code>
              <span className="guide-tree__role">{row.role}</span>
              <span className="guide-tree__note">{row.note}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="guide-callout">
        4 файла: <code>{'{id}'}.json</code>, <code>{'{id}'}.atlas</code>,{' '}
        <code>{'{id}'}.webp</code>, <code>{'{id}'}_static.webp</code>.
      </p>
    </div>
  )
}

function AnimationsSection() {
  const rows = [
    {
      clip: 'idle',
      when: 'Покой на барабане после остановки',
      loop: 'Да (loop)',
    },
    {
      clip: 'stop',
      when: 'Посадка символа при стопе барабана',
      loop: 'Нет (one-shot)',
    },
    {
      clip: 'activation',
      when: 'Выигрышная линия / win-демо',
      loop: 'Да (loop)',
    },
  ] as const

  return (
    <div className="guide-copy">
      <div className="naming-table-wrap">
        <table className="naming-table">
          <thead>
            <tr>
              <th>Имя клипа</th>
              <th>Когда играет</th>
              <th>Loop</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.clip}>
                <td>
                  <code>{row.clip}</code>
                </td>
                <td>{row.when}</td>
                <td>{row.loop}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FormatSection() {
  return (
    <div className="guide-copy">
      <p>
        Static барабана и текстуры Spine — <strong>WebP</strong>.{' '}
        <code>H1_static.webp</code> и <code>H1.webp</code> — разные файлы.
      </p>
    </div>
  )
}

function NamingSection() {
  const rows = [
    { id: 'H1', role: 'High 1' },
    { id: 'H2', role: 'High 2' },
    { id: 'H3', role: 'High 3' },
    { id: 'H4', role: 'High 4' },
    { id: 'L1', role: 'Low 1' },
    { id: 'L2', role: 'Low 2' },
    { id: 'L3', role: 'Low 3' },
    { id: 'L4', role: 'Low 4' },
  ] as const

  return (
    <div className="guide-copy">
      <div className="naming-table-wrap">
        <table className="naming-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Тип</th>
              <th>Static (барабан)</th>
              <th>Spine-папка</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <code>{row.id}</code>
                </td>
                <td>{row.role}</td>
                <td>
                  <code>{row.id}_static.webp</code>
                </td>
                <td>
                  <code>{row.id}/</code> → <code>{row.id}.json</code>,{' '}
                  <code>{row.id}.atlas</code>, <code>{row.id}.webp</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SizeSection() {
  return (
    <div className="guide-copy">
      <p>
        Static — квадрат <strong>196×196</strong> или <strong>392×392</strong> WebP.
        На барабане отображается как <strong>196×196</strong>.
      </p>
    </div>
  )
}
