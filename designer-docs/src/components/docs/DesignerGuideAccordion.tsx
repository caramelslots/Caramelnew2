import { useCallback, useId, useMemo, useState } from 'react'
import { catalogSourceFromId, catalogUrls } from '../../catalog/assetPaths'
import { getCatalogSymbol } from '../../catalog/symbolCatalog'
import { AnimationControls } from '../symbols/AnimationControls'
import { SpinePreviewStage } from '../../pixi/SpinePreviewStage'
import type {
  AnimationRole,
  AnimationRoleMap,
  PlaybackState,
  SpineMetrics,
} from '../../types'

type SectionId = 'format' | 'naming' | 'size'

const SECTIONS: { id: SectionId; title: string; summary: string }[] = [
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
    title: 'Размер — 196×196',
    summary: 'Квадратный static-спрайт',
  },
]

export function DesignerGuideAccordion() {
  const baseId = useId()
  const [symbolsOpen, setSymbolsOpen] = useState(true)
  const [openId, setOpenId] = useState<SectionId | null>('naming')

  const toggleInner = (id: SectionId) => {
    setOpenId((current) => (current === id ? null : id))
  }

  const symbolsPanelId = `${baseId}-symbols-panel`
  const symbolsBtnId = `${baseId}-symbols-btn`

  return (
    <section className="guide" aria-labelledby={`${baseId}-title`}>
      <div className="guide__head">
        <div>
          <p className="guide__eyebrow">Требования к ассетам</p>
          <h2 id={`${baseId}-title`}>Документация для дизайнеров</h2>
        </div>
        <p className="guide__lead">
          Общие правила сдачи символов для слотов. Соблюдайте их на всех новых
          проектах — так ассеты сразу подходят под пайплайн без правок.
        </p>
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
              <span className="accordion__hint">
                Формат, нейминг, размер + пример H1
              </span>
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
                <GuideSymbolPreview />
              </aside>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function GuideSymbolPreview() {
  const source = useMemo(() => catalogSourceFromId('diamond'), [])
  const staticSpriteUrl = useMemo(() => {
    const symbol = getCatalogSymbol('diamond')
    return symbol ? catalogUrls(symbol).staticSpriteUrl : null
  }, [])
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
          <p className="guide-preview__name">Diamond · пример</p>
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
            <p className="muted">H1.webp · 196×196</p>
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

function FormatSection() {
  return (
    <div className="guide-copy">
      <p>
        Статический символ для барабана сдаётся <strong>только в формате WebP</strong>.
      </p>
      <ul>
        <li>Один символ = один файл WebP (без PNG/JPG в финальной сдаче).</li>
        <li>
          WebP нужен для стабильного качества при небольшом весе текстур на
          барабане.
        </li>
        <li>
          Текстура Spine-атласа тоже предпочтительно WebP, но это{' '}
          <em>отдельный</em> файл анимации. Она не заменяет static-спрайт.
        </li>
      </ul>
      <p className="guide-callout">
        Имя файла: <code>H1.webp</code>, <code>L2.webp</code> и т.д. — расширение
        только <code>.webp</code>.
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
      <p>
        Символы именуются по <strong>слотовым id</strong>, а не по названию арта.
        Одинаковые имена у static-файла и у папки Spine.
      </p>

      <div className="guide-defs">
        <div className="guide-def">
          <strong>High (H1–H4)</strong>
          <p>
            Высокооплачиваемые символы — ключевой арт слота, обычно предметы или
            персонажи. Дают более крупные выплаты; в наборе их меньше по частоте,
            зато они визуально главные.
          </p>
        </div>
        <div className="guide-def">
          <strong>Low (L1–L4)</strong>
          <p>
            Низкооплачиваемые символы — чаще всего буквы/масти (A, K, Q, J и т.п.).
            Появляются чаще, выплаты меньше; визуально проще и легче читаются в
            сетке.
          </p>
        </div>
      </div>

      <div className="naming-table-wrap">
        <table className="naming-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Тип</th>
              <th>Static</th>
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
                  <code>{row.id}.webp</code>
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

      <ul>
        <li>
          Не сдаём финальные имена вроде «Diamond», «Ace» — только id из таблицы
          (<code>H1</code>, <code>L3</code>…).
        </li>
        <li>
          В <code>.atlas</code> имя страницы текстуры = имя файла:{' '}
          <code>H1.webp</code>.
        </li>
        <li>
          Анимации: <code>idle</code>, <code>stop</code> (посадка),{' '}
          <code>win</code> (или согласованный аналог вроде <code>activation</code>).
        </li>
      </ul>
    </div>
  )
}

function SizeSection() {
  return (
    <div className="guide-copy">
      <p>
        Размер <strong>static-спрайта</strong> для барабана:{' '}
        <strong>196×196 пикселей</strong>.
      </p>
      <ul>
        <li>Холст строго квадратный: ширина = высота = 196.</li>
        <li>
          Рисуйте символ внутри квадрата с небольшим запасом по краям — на
          барабане спрайт масштабируется в ячейку.
        </li>
        <li>
          Не используйте 512 / 1024 / 2048 как static. Большие размеры — только
          для текстуры Spine-атласа анимации.
        </li>
      </ul>
      <p className="guide-callout">
        Минимум на символ: <code>H1.webp</code> 196×196 + папка Spine{' '}
        <code>H1/</code> с анимациями.
      </p>
    </div>
  )
}
