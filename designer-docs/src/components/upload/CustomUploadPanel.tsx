import { useId, useRef, useState, type DragEvent, type FormEvent } from 'react'
import type { ValidatedUpload } from './UploadValidation'
import {
  buildValidatedUpload,
  buildValidatedUploadsFromFiles,
  collectFilesFromDataTransfer,
  staticSpecHint,
  validateUploadFiles,
  type UploadPick,
} from './UploadValidation'

type CustomUploadPanelProps = {
  onUpload: (payload: ValidatedUpload) => void
  onUploadMany?: (payloads: ValidatedUpload[]) => void
}

const emptyPick = (): UploadPick => ({
  skeleton: null,
  atlas: null,
  texture: null,
  staticSprite: null,
})

export function CustomUploadPanel({ onUpload, onUploadMany }: CustomUploadPanelProps) {
  const formId = useId()
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [pick, setPick] = useState<UploadPick>(emptyPick)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const setFile = (key: keyof UploadPick, fileList: FileList | null) => {
    setPick((prev) => ({ ...prev, [key]: fileList?.[0] ?? null }))
    setError(null)
    setNotes([])
  }

  const commitOne = (validated: ValidatedUpload) => {
    onUpload(validated)
  }

  const commitMany = (validated: ValidatedUpload[]) => {
    if (validated.length === 1) {
      commitOne(validated[0]!)
      return
    }
    if (onUploadMany) onUploadMany(validated)
    else validated.forEach(commitOne)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validationError = validateUploadFiles(pick)
    if (validationError) {
      setError(validationError)
      return
    }

    setBusy(true)
    setError(null)
    setNotes([])
    try {
      const validated = await buildValidatedUpload(pick)
      const hint = staticSpecHint(validated.staticSprite)
      commitOne(validated)
      setPick(emptyPick)
      setNotes(
        hint
          ? [hint]
          : validated.staticSprite
            ? ['Символ добавлен в библиотеку.']
            : ['Символ добавлен без static — статус Partial.'],
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const ingestFiles = async (files: File[]) => {
    setBusy(true)
    setError(null)
    setNotes([])
    try {
      const { uploads, errors } = await buildValidatedUploadsFromFiles(files)
      if (uploads.length > 0) commitMany(uploads)
      const hints = uploads
        .map((item) => {
          const hint = staticSpecHint(item.staticSprite)
          return hint ? `${item.label}: ${hint}` : null
        })
        .filter((line): line is string => Boolean(line))
      setNotes([
        uploads.length > 0 ? `Добавлено символов: ${uploads.length}.` : '',
        ...hints,
      ].filter(Boolean))
      if (errors.length > 0) {
        setError(errors.join('\n'))
      }
      setPick(emptyPick)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const handleFolderInput = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    await ingestFiles([...fileList])
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragOver(false)
    try {
      const files = await collectFilesFromDataTransfer(event.dataTransfer)
      await ingestFiles(files)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Drop failed')
    }
  }

  return (
    <section className="panel-block" aria-labelledby={`${formId}-title`}>
      <div className="panel-block__head">
        <h2 id={`${formId}-title`}>Upload</h2>
        <p>
          Spine + отдельный static WebP. Можно дропнуть несколько папок сразу.
        </p>
      </div>

      <div
        className={dragOver ? 'drop-zone is-active' : 'drop-zone'}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          if (event.currentTarget === event.target) setDragOver(false)
        }}
        onDrop={handleDrop}
      >
        <p>
          <strong>Drop folder(s) here</strong>
        </p>
        <p>
          На символ: <code>.json</code> + <code>.atlas</code> + текстура атласа + static
          (<code>H1.webp</code> / <code>*_static.webp</code>).
        </p>
        <button
          className="btn"
          disabled={busy}
          type="button"
          onClick={() => folderInputRef.current?.click()}
        >
          Choose folder
        </button>
        <input
          ref={folderInputRef}
          className="sr-only"
          multiple
          type="file"
          onChange={(event) => void handleFolderInput(event.target.files)}
          {...({
            webkitdirectory: '',
            directory: '',
          } as Record<string, string>)}
        />
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <p className="upload-or">или выбрать файлы вручную</p>

        <label className="file-field">
          <span>Skeleton (.json)</span>
          <input
            accept=".json,application/json"
            type="file"
            onChange={(event) => setFile('skeleton', event.target.files)}
          />
          <em>{pick.skeleton?.name ?? 'Choose file'}</em>
        </label>

        <label className="file-field">
          <span>Atlas (.atlas)</span>
          <input
            accept=".atlas,text/plain"
            type="file"
            onChange={(event) => setFile('atlas', event.target.files)}
          />
          <em>{pick.atlas?.name ?? 'Choose file'}</em>
        </label>

        <label className="file-field">
          <span>Atlas texture</span>
          <input
            accept=".webp,.png,.jpg,.jpeg,image/*"
            type="file"
            onChange={(event) => setFile('texture', event.target.files)}
          />
          <em>{pick.texture?.name ?? 'Choose file'}</em>
        </label>

        <label className="file-field">
          <span>Static sprite (reel)</span>
          <input
            accept=".webp,.png,.jpg,.jpeg,image/*"
            type="file"
            onChange={(event) => setFile('staticSprite', event.target.files)}
          />
          <em>{pick.staticSprite?.name ?? 'H1.webp · 196×196'}</em>
        </label>

        {error ? (
          <p className="form-error" style={{ whiteSpace: 'pre-wrap' }}>
            {error}
          </p>
        ) : null}
        {notes.map((note) => (
          <p className="form-note" key={note}>
            {note}
          </p>
        ))}

        <button className="btn btn--primary" disabled={busy} type="submit">
          {busy ? 'Loading…' : 'Add to library'}
        </button>
      </form>
    </section>
  )
}
