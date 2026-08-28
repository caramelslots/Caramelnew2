import { useId, useRef, useState, type DragEvent } from 'react'
import {
  GUIDE_BACKGROUND_SPINE_PACK,
  GUIDE_BACKGROUND_STATIC_URL,
} from '../../catalog/backgroundSpecs'
import {
  buildBackgroundPackFromFiles,
  type BackgroundPackUpload,
} from '../../stage/backgroundUpload'
import { revokeBackgroundSpine, type StagePackOverrides } from '../../stage/stagePack'
import { collectFilesFromDataTransfer } from '../upload/UploadValidation'

type StageAssetsPanelProps = {
  overrides: StagePackOverrides
  onChange: (next: StagePackOverrides) => void
}

export function StageAssetsPanel({ overrides, onChange }: StageAssetsPanelProps) {
  const folderInputRef = useRef<HTMLInputElement>(null)
  const activePackRevokeRef = useRef<(() => void) | null>(null)
  const [bgError, setBgError] = useState<string | null>(null)
  const [bgWarnings, setBgWarnings] = useState<string[]>([])
  const [bgSuccess, setBgSuccess] = useState<string | null>(null)
  const [bgBusy, setBgBusy] = useState(false)
  const [bgDrag, setBgDrag] = useState(false)

  const revokeCustomBackground = () => {
    activePackRevokeRef.current?.()
    activePackRevokeRef.current = null
    revokeBackgroundSpine(overrides.backgroundSpine)
    if (overrides.background?.startsWith('blob:')) {
      URL.revokeObjectURL(overrides.background)
    }
  }

  const applyBackgroundPack = (pack: BackgroundPackUpload | null) => {
    revokeCustomBackground()
    const next = { ...overrides }
    delete next.backgroundSpine
    delete next.background

    if (pack) {
      activePackRevokeRef.current = pack.revoke
      next.backgroundSpine = pack.spine
      if (pack.staticUrl) next.background = pack.staticUrl
    }

    onChange(next)
    setBgError(null)
    setBgWarnings(pack?.warnings ?? [])
    setBgSuccess(
      pack
        ? `Фон «${pack.spine.label ?? 'background'}» · ${Object.keys(pack.spine.pageUrls).length} atlas pages`
        : null,
    )
  }

  const commitBackgroundFiles = async (files: File[]) => {
    setBgBusy(true)
    setBgError(null)
    setBgWarnings([])
    setBgSuccess(null)
    try {
      const pack = await buildBackgroundPackFromFiles(files)
      applyBackgroundPack(pack)
    } catch (err) {
      setBgError(err instanceof Error ? err.message : 'Background upload failed')
    } finally {
      setBgBusy(false)
    }
  }

  const onBackgroundFolder = async (fileList: FileList | null) => {
    if (!fileList?.length) return
    await commitBackgroundFiles([...fileList])
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  const onBackgroundDrop = async (event: DragEvent) => {
    event.preventDefault()
    setBgDrag(false)
    try {
      const files = await collectFilesFromDataTransfer(event.dataTransfer)
      await commitBackgroundFiles(files)
    } catch (err) {
      setBgError(err instanceof Error ? err.message : 'Drop failed')
    }
  }

  const loadExampleBackground = () => {
    revokeCustomBackground()
    onChange({
      ...overrides,
      background: GUIDE_BACKGROUND_STATIC_URL,
      backgroundSpine: GUIDE_BACKGROUND_SPINE_PACK,
    })
    setBgError(null)
    setBgWarnings([])
    setBgSuccess('Пример designer_assets/background')
  }

  const resetBackground = () => {
    applyBackgroundPack(null)
  }

  const spine = overrides.backgroundSpine
  const hasCustomBackground = Boolean(spine || overrides.background?.startsWith('blob:'))

  return (
    <section className="panel-block stage-assets-panel">
      <div className="panel-block__head">
        <h2>Background</h2>
        <p>
          Папка <code>background/</code> как в документации — Spine + static, multi-page atlas.
        </p>
      </div>

      <div
        className={
          bgDrag
            ? 'stage-spine-drop is-active'
            : hasCustomBackground
              ? 'stage-spine-drop is-custom'
              : 'stage-spine-drop'
        }
        onDragEnter={(event) => {
          event.preventDefault()
          setBgDrag(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          if (event.currentTarget === event.target) setBgDrag(false)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onBackgroundDrop}
      >
        <div className="stage-spine-drop__meta">
          <strong>{spine ? spine.label ?? 'Custom background' : 'Street background'}</strong>
          <span>
            {spine
              ? `${Object.keys(spine.pageUrls).length} atlas pages · ${overrides.background ? 'static loaded' : 'no static'}`
              : 'background.json + .atlas + .webp (+ _2, _3, …) + background_static.webp'}
          </span>
        </div>
        <div className="stage-asset-row__actions">
          <button
            className="btn btn--primary"
            disabled={bgBusy}
            type="button"
            onClick={() => folderInputRef.current?.click()}
          >
            {bgBusy ? 'Loading…' : 'Choose folder'}
          </button>
          <button className="btn" type="button" onClick={loadExampleBackground}>
            Example
          </button>
          {hasCustomBackground ? (
            <button className="btn btn--ghost" type="button" onClick={resetBackground}>
              Reset
            </button>
          ) : null}
        </div>
        <input
          ref={folderInputRef}
          className="sr-only"
          multiple
          type="file"
          onChange={(event) => void onBackgroundFolder(event.target.files)}
          {...({
            webkitdirectory: '',
            directory: '',
          } as Record<string, string>)}
        />
      </div>

      {bgSuccess ? <p className="form-note">{bgSuccess}</p> : null}
      {bgWarnings.length > 0 ? (
        <div className="form-warnings" role="status">
          <p className="form-warnings__title">Не совпадает с документацией</p>
          <ul>
            {bgWarnings.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="muted">Фон всё равно применится в Reel Lab.</p>
        </div>
      ) : null}
      {bgError ? <p className="form-error">{bgError}</p> : null}

      <p className="stage-assets-panel__hint">
        Atlas может содержать любое число страниц — имена в <code>.atlas</code> = имена файлов (
        <code>background.webp</code>, <code>background_2.webp</code>, …). При Spine still прячется
        после загрузки анимации.
      </p>
    </section>
  )
}
