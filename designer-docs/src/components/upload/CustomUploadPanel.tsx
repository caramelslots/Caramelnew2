import { useId, useRef, useState, type DragEvent } from 'react'
import { computeLibraryStatus } from '../../library/types'
import type { ValidatedUpload } from './UploadValidation'
import {
  buildValidatedUploadsFromFiles,
  collectFilesFromDataTransfer,
} from './UploadValidation'

type CustomUploadPanelProps = {
  onUpload: (payload: ValidatedUpload) => void
  onUploadMany?: (payloads: ValidatedUpload[]) => void
}

function docWarningsForUpload(upload: ValidatedUpload): string[] {
  return computeLibraryStatus({
    hasSpine: true,
    staticSprite: upload.staticSprite,
    roles: upload.roles,
  }).warnings
}

export function CustomUploadPanel({ onUpload, onUploadMany }: CustomUploadPanelProps) {
  const formId = useId()
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const commitMany = (validated: ValidatedUpload[]) => {
    if (validated.length === 1) {
      onUpload(validated[0]!)
      return
    }
    if (onUploadMany) onUploadMany(validated)
    else validated.forEach((item) => onUpload(item))
  }

  const ingestFiles = async (files: File[]) => {
    setBusy(true)
    setError(null)
    setWarnings([])
    setSuccess(null)
    try {
      const { uploads, errors } = await buildValidatedUploadsFromFiles(files)
      if (uploads.length > 0) {
        commitMany(uploads)
        const docWarnings = uploads.flatMap((upload) =>
          docWarningsForUpload(upload).map((line) => `${upload.label}: ${line}`),
        )
        setWarnings(docWarnings)
        setSuccess(
          uploads.length === 1
            ? `Символ «${uploads[0]!.label}» добавлен.`
            : `Добавлено символов: ${uploads.length}.`,
        )
      }
      if (errors.length > 0) {
        setError(errors.join('\n'))
      }
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
        <p>Папка символа: .json + .atlas + текстура + static WebP</p>
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
        <p className="muted">Пример: папка H1/ как в документации</p>
        <button
          className="btn btn--primary"
          disabled={busy}
          type="button"
          onClick={() => folderInputRef.current?.click()}
        >
          {busy ? 'Loading…' : 'Choose folder'}
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

      {success ? <p className="form-note">{success}</p> : null}
      {warnings.length > 0 ? (
        <div className="form-warnings" role="status">
          <p className="form-warnings__title">Не совпадает с документацией</p>
          <ul>
            {warnings.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="muted">Символ всё равно добавлен — preview и проверка доступны.</p>
        </div>
      ) : null}
      {error ? (
        <p className="form-error" style={{ whiteSpace: 'pre-wrap' }}>
          {error}
        </p>
      ) : null}
    </section>
  )
}
