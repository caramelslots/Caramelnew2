import { useId, useRef, useState, type DragEvent, type FormEvent } from 'react'
import type { ValidatedUpload } from './UploadValidation'
import {
  buildValidatedUpload,
  buildValidatedUploadFromFiles,
  collectFilesFromDataTransfer,
  validateUploadFiles,
  type UploadPick,
} from './UploadValidation'

type CustomUploadPanelProps = {
  onUpload: (payload: ValidatedUpload) => void
}

const emptyPick = (): UploadPick => ({
  skeleton: null,
  atlas: null,
  texture: null,
})

export function CustomUploadPanel({ onUpload }: CustomUploadPanelProps) {
  const formId = useId()
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [pick, setPick] = useState<UploadPick>(emptyPick)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const setFile = (key: keyof UploadPick, fileList: FileList | null) => {
    setPick((prev) => ({ ...prev, [key]: fileList?.[0] ?? null }))
    setError(null)
  }

  const commitUpload = async (validated: ValidatedUpload) => {
    onUpload(validated)
    setPick(emptyPick)
    setError(null)
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
    try {
      const validated = await buildValidatedUpload(pick)
      await commitUpload(validated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const ingestFiles = async (files: File[]) => {
    setBusy(true)
    setError(null)
    try {
      const validated = await buildValidatedUploadFromFiles(files)
      await commitUpload(validated)
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
        <h2 id={`${formId}-title`}>Upload own</h2>
        <p>Drop a Spine folder, or pick JSON + atlas + texture.</p>
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
          <strong>Drop folder here</strong>
        </p>
        <p>Needs one .json, one .atlas, and a texture.</p>
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
        <p className="upload-or">or pick files</p>

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
          <span>Texture (.webp / .png)</span>
          <input
            accept=".webp,.png,.jpg,.jpeg,image/*"
            type="file"
            onChange={(event) => setFile('texture', event.target.files)}
          />
          <em>{pick.texture?.name ?? 'Choose file'}</em>
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="btn btn--primary" disabled={busy} type="submit">
          {busy ? 'Loading…' : 'Preview upload'}
        </button>
      </form>
    </section>
  )
}
