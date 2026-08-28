import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  BACKGROUND_STATIC_HEIGHT,
  BACKGROUND_STATIC_WIDTH,
} from '../../catalog/backgroundSpecs'
import { BackgroundPreviewStage } from '../../pixi/BackgroundPreviewStage'
import type { StageBackgroundSpinePack } from '../../stage/stagePack'

type BackgroundPreviewModalProps = {
  open: boolean
  staticUrl: string
  spinePack: StageBackgroundSpinePack
  onClose: () => void
}

export function BackgroundPreviewModal({
  open,
  staticUrl,
  spinePack,
  onClose,
}: BackgroundPreviewModalProps) {
  const [mode, setMode] = useState<'animated' | 'static'>('animated')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLoadingChange = useCallback((next: boolean) => {
    setLoading(next)
  }, [])

  const handleError = useCallback((message: string | null) => {
    setError(message)
  }, [])

  useEffect(() => {
    if (!open) return
    setMode('animated')
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="background-preview-fullscreen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="background-preview-title"
    >
      <div className="background-preview-fullscreen__stage">
        <div className="background-preview-frame">
          <BackgroundPreviewStage
            key={mode}
            spinePack={mode === 'animated' ? spinePack : null}
            staticUrl={staticUrl}
            onError={handleError}
            onLoadingChange={handleLoadingChange}
          />
        </div>
      </div>

      <div className="background-preview-fullscreen__chrome">
        <header className="background-preview-fullscreen__head">
          <div>
            <h2 id="background-preview-title">Пример фона</h2>
            <p className="muted">designer_assets/background · WebP + Spine</p>
          </div>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Закрыть
          </button>
        </header>

        <div className="background-preview-fullscreen__toolbar">
          <div className="segmented" role="group" aria-label="Режим preview">
            <button
              className={mode === 'animated' ? 'segmented__btn is-active' : 'segmented__btn'}
              type="button"
              onClick={() => {
                setError(null)
                setMode('animated')
              }}
            >
              Spine
            </button>
            <button
              className={mode === 'static' ? 'segmented__btn is-active' : 'segmented__btn'}
              type="button"
              onClick={() => {
                setError(null)
                setLoading(false)
                setMode('static')
              }}
            >
              Static
            </button>
          </div>
          <p className="muted">
            {mode === 'static'
              ? 'Static still'
              : loading
                ? 'Загрузка…'
                : error
                  ? 'Ошибка'
                  : `${BACKGROUND_STATIC_WIDTH}×${BACKGROUND_STATIC_HEIGHT} preview`}
          </p>
        </div>

        {error ? <p className="form-error background-preview-fullscreen__error">{error}</p> : null}

        <p className="background-preview-fullscreen__hint">
          Animated — <code>background.json</code> + atlas. Static —{' '}
          <code>background_static.webp</code> ({BACKGROUND_STATIC_WIDTH}×{BACKGROUND_STATIC_HEIGHT}
          ). Esc — закрыть.
        </p>
      </div>
    </div>,
    document.body,
  )
}
