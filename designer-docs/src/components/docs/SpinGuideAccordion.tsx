import { useCallback, useState } from 'react'
import {
  GUIDE_SPIN_FIT_OPTIONS,
  GUIDE_SPIN_SOURCE,
  GUIDE_SPIN_STATIC_AUTOPLAY_URL,
  GUIDE_SPIN_STATIC_NORMAL_URL,
  SPIN_FOLDER_ROWS,
  SPIN_PRESS_CLIP,
} from '../../catalog/spinSpecs'
import { HUD_SQUARE_ICON_PEAK } from '../../catalog/hudSpecs'
import { SpinePreviewStage } from '../../pixi/SpinePreviewStage'
import type { AnimationRoleMap, PlaybackState, SpineMetrics } from '../../types'

export type SpinSectionId = 'structure' | 'animation' | 'statics'

const SPIN_SECTIONS: { id: SpinSectionId; title: string; summary: string }[] = [
  {
    id: 'structure',
    title: 'Структура папки',
    summary: 'Как сдавать spin — пример designer_assets/spin',
  },
  {
    id: 'animation',
    title: 'Анимация — press',
    summary: 'One-shot клип animation',
  },
  {
    id: 'statics',
    title: 'Две static WebP',
    summary: 'spin_1 обычный · spin_2 автоигра',
  },
]

type HudSpinNestedAccordionProps = {
  baseId: string
}

/** Nested spin docs — lives inside HUD «Spin» panel. */
export function HudSpinNestedAccordion({ baseId }: HudSpinNestedAccordionProps) {
  const [openId, setOpenId] = useState<SpinSectionId | null>(null)

  const toggleInner = (id: SpinSectionId) => {
    setOpenId((current) => (current === id ? null : id))
  }

  return (
    <div className="accordion accordion--nested accordion--spin">
      {SPIN_SECTIONS.map((section) => {
        const isOpen = openId === section.id
        const innerPanelId = `${baseId}-spin-${section.id}-panel`
        const innerBtnId = `${baseId}-spin-${section.id}-btn`

        return (
          <div
            className={isOpen ? 'accordion__item is-open' : 'accordion__item'}
            key={section.id}
          >
            <h5 className="accordion__heading">
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
            </h5>

            <div
              aria-labelledby={innerBtnId}
              className="accordion__panel"
              id={innerPanelId}
              hidden={!isOpen}
              role="region"
            >
              {section.id === 'structure' ? <SpinStructureSection /> : null}
              {section.id === 'animation' ? <SpinAnimationSection /> : null}
              {section.id === 'statics' ? <SpinStaticsSection /> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SpinStructureSection() {
  return (
    <div className="guide-copy">
      <div className="guide-tree" aria-label="Структура папки spin">
        <p className="guide-tree__root">
          <span className="guide-tree__icon" aria-hidden="true">
            📁
          </span>
          <code>spin/</code>
        </p>
        <ul className="guide-tree__list">
          {SPIN_FOLDER_ROWS.map((row) => (
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

function SpinAnimationSection() {
  const rows = [
    {
      clip: SPIN_PRESS_CLIP,
      when: 'Нажатие на кнопку спина (обычный режим)',
      loop: 'Нет (one-shot)',
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
      <p className="guide-callout">
        В автоигре со счётчиком — только <code>spin_2.webp</code>, без Spine.
      </p>
    </div>
  )
}

function SpinStaticsSection() {
  return (
    <div className="guide-copy">
      <div className="naming-table-wrap">
        <table className="naming-table">
          <thead>
            <tr>
              <th>Файл</th>
              <th>Режим</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>spin_1.webp</code>
              </td>
              <td>Обычный спин — still / fallback</td>
            </tr>
            <tr>
              <td>
                <code>spin_2.webp</code>
              </td>
              <td>Автоигра + счётчик</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function GuideSpinPreview() {
  const [playback, setPlayback] = useState<PlaybackState>({
    animationName: null,
    loop: false,
    speed: 1,
    playNonce: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)

  const replayPress = () => {
    if (loading || error || playing) return
    setPlaying(true)
    setPlayback((prev) => ({
      animationName: SPIN_PRESS_CLIP,
      loop: false,
      speed: 1,
      playNonce: prev.playNonce + 1,
    }))
  }

  const handleAnimationsChange = useCallback((_names: string[], _roles: AnimationRoleMap) => {
    // Spin has a single press clip.
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

  const handlePlaybackEnded = useCallback(() => {
    setPlaying(false)
    setPlayback((prev) => ({
      ...prev,
      animationName: null,
    }))
  }, [])

  return (
    <div className="guide-preview guide-preview--spin">
      <div className="guide-preview__head">
        <div>
          <p className="guide-preview__id">Spin</p>
          <p className="guide-preview__name">Пример кнопки</p>
        </div>
        <p className="muted">{loading ? 'Загрузка…' : error ? 'Ошибка' : 'Preview'}</p>
      </div>

      <div
        className="guide-preview__stage guide-preview__stage--spin"
        role="presentation"
        onClick={() => {
          if (!loading && !error) replayPress()
        }}
      >
        <SpinePreviewStage
          fitOptions={GUIDE_SPIN_FIT_OPTIONS}
          playback={playback}
          resetOnComplete
          source={GUIDE_SPIN_SOURCE}
          startEmpty
          onAnimationsChange={handleAnimationsChange}
          onError={handleError}
          onLoadingChange={handleLoadingChange}
          onMetricsChange={handleMetricsChange}
          onPlaybackComplete={handlePlaybackEnded}
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="guide-hud-spin__controls">
        <button
          className="btn btn--ghost"
          disabled={loading || Boolean(error) || playing}
          type="button"
          onClick={replayPress}
        >
          {playing ? 'Playing…' : `Play (${SPIN_PRESS_CLIP})`}
        </button>
      </div>

      <div className="guide-hud-spin__statics">
        <div className="guide-hud-spin__static">
          <div className="guide-hud-spin__static-head">
            <p className="guide-hud-spin__static-label">spin_1.webp</p>
            <p className="muted">Обычный · {HUD_SQUARE_ICON_PEAK}</p>
          </div>
          <div className="guide-hud-spin__frame">
            <img
              alt="Spin normal static"
              className="guide-hud-spin__img"
              src={GUIDE_SPIN_STATIC_NORMAL_URL}
            />
          </div>
        </div>

        <div className="guide-hud-spin__static">
          <div className="guide-hud-spin__static-head">
            <p className="guide-hud-spin__static-label">spin_2.webp</p>
            <p className="muted">Автоигра · {HUD_SQUARE_ICON_PEAK}</p>
          </div>
          <div className="guide-hud-spin__frame">
            <img
              alt="Spin autoplay static"
              className="guide-hud-spin__img"
              src={GUIDE_SPIN_STATIC_AUTOPLAY_URL}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
