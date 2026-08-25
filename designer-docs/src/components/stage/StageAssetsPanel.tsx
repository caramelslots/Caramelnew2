import { useId, useRef, useState, type DragEvent } from 'react'
import { getDefaultStageUrls } from '../../stage/defaultStageUrls'
import { atlasPageNames } from '../../stage/backgroundSpine'
import {
  STAGE_SLOT_META,
  revokeBackgroundSpine,
  type StageBackgroundSpinePack,
  type StagePackOverrides,
  type StageSlotId,
} from '../../stage/stagePack'

type StageAssetsPanelProps = {
  overrides: StagePackOverrides
  onChange: (next: StagePackOverrides) => void
}

const JSON_EXT = /\.json$/i
const ATLAS_EXT = /\.atlas$/i
const TEX_EXT = /\.(webp|png|jpe?g)$/i

export function StageAssetsPanel({ overrides, onChange }: StageAssetsPanelProps) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const spineInputRef = useRef<HTMLInputElement>(null)
  const pendingSlot = useRef<StageSlotId | null>(null)
  const defaults = getDefaultStageUrls()
  const [spineError, setSpineError] = useState<string | null>(null)
  const [spineDrag, setSpineDrag] = useState(false)

  const setSlot = (id: StageSlotId, url: string | null) => {
    const next = { ...overrides }
    if (url) next[id] = url
    else delete next[id]
    onChange(next)
  }

  const setBackgroundSpine = (pack: StageBackgroundSpinePack | null) => {
    const next = { ...overrides }
    revokeBackgroundSpine(overrides.backgroundSpine)
    if (pack) next.backgroundSpine = pack
    else delete next.backgroundSpine
    onChange(next)
    setSpineError(null)
  }

  const pick = (id: StageSlotId) => {
    pendingSlot.current = id
    const input = fileRef.current
    if (!input) return
    const meta = STAGE_SLOT_META.find((item) => item.id === id)
    input.accept = meta?.accept ?? 'image/*'
    input.click()
  }

  const onFile = (fileList: FileList | null) => {
    const id = pendingSlot.current
    pendingSlot.current = null
    const file = fileList?.[0]
    if (!id || !file) return
    if (overrides[id]?.startsWith('blob:')) URL.revokeObjectURL(overrides[id]!)
    setSlot(id, URL.createObjectURL(file))
  }

  const commitSpineFiles = async (files: File[]) => {
    setSpineError(null)
    try {
      const pack = await buildBackgroundSpinePack(files)
      setBackgroundSpine(pack)
    } catch (err) {
      setSpineError(err instanceof Error ? err.message : 'Spine background upload failed')
    }
  }

  const onSpineFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return
    void commitSpineFiles([...fileList])
  }

  const onSpineDrop = (event: DragEvent) => {
    event.preventDefault()
    setSpineDrag(false)
    const list = event.dataTransfer?.files
    if (list?.length) void commitSpineFiles([...list])
  }

  const env = STAGE_SLOT_META.filter((item) => item.group === 'environment')
  const spine = overrides.backgroundSpine

  return (
    <section className="panel-block stage-assets-panel">
      <div className="panel-block__head">
        <h2>Stage assets</h2>
        <p>Свои фон / desk. Пусто = нейтральный default (не cat_mafia).</p>
      </div>

      <input
        ref={fileRef}
        accept="image/*"
        className="sr-only"
        id={inputId}
        type="file"
        onChange={(event) => {
          onFile(event.target.files)
          event.target.value = ''
        }}
      />
      <input
        ref={spineInputRef}
        accept=".json,.atlas,.webp,.png,.jpg,.jpeg"
        className="sr-only"
        multiple
        type="file"
        onChange={(event) => {
          onSpineFiles(event.target.files)
          event.target.value = ''
        }}
      />

      <p className="stage-assets-panel__group">Animated background</p>
      <div
        className={
          spineDrag
            ? 'stage-spine-drop is-active'
            : spine
              ? 'stage-spine-drop is-custom'
              : 'stage-spine-drop'
        }
        onDragEnter={(event) => {
          event.preventDefault()
          setSpineDrag(true)
        }}
        onDragLeave={() => setSpineDrag(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onSpineDrop}
      >
        <div className="stage-spine-drop__meta">
          <strong>{spine ? spine.label ?? 'Spine background' : 'Spine street'}</strong>
          <span>
            {spine
              ? `Custom · ${Object.keys(spine.pageUrls).length} tex · ${spine.animationName ?? 'auto idle'}`
              : 'json + atlas + webp (можно несколько страниц)'}
          </span>
        </div>
        <div className="stage-asset-row__actions">
          <button
            className="btn"
            type="button"
            onClick={() => spineInputRef.current?.click()}
          >
            Upload
          </button>
          {spine ? (
            <button className="btn btn--ghost" type="button" onClick={() => setBackgroundSpine(null)}>
              Reset
            </button>
          ) : null}
        </div>
      </div>
      {spineError ? <p className="form-error">{spineError}</p> : null}
      <p className="stage-assets-panel__hint">
        Как в cat_mafia: папка <code>background/</code> с <code>skeleton.json</code>,{' '}
        <code>skeleton.atlas</code>, <code>skeleton.webp</code> (+ <code>_2</code>/<code>_3</code>).
        При наличии Spine still-фон прячется.
      </p>

      <p className="stage-assets-panel__group">Environment</p>
      <ul className="stage-asset-list">
        {env.map((slot) => (
          <StageAssetRow
            key={slot.id}
            custom={Boolean(overrides[slot.id])}
            label={slot.label}
            previewUrl={overrides[slot.id] ?? defaults[slot.id]}
            onClear={() => setSlot(slot.id, null)}
            onPick={() => pick(slot.id)}
          />
        ))}
      </ul>
    </section>
  )
}

async function buildBackgroundSpinePack(files: File[]): Promise<StageBackgroundSpinePack> {
  const skeleton = files.find((file) => JSON_EXT.test(file.name))
  const atlas = files.find((file) => ATLAS_EXT.test(file.name))
  if (!skeleton) throw new Error('Нужен skeleton.json')
  if (!atlas) throw new Error('Нужен skeleton.atlas')

  const atlasText = await atlas.text()
  const pages = atlasPageNames(atlasText)
  if (pages.length === 0) throw new Error('В .atlas нет страниц текстур')

  const byName = new Map(files.map((file) => [file.name.toLowerCase(), file]))
  const pageUrls: Record<string, string> = {}
  const urlsToRevoke: string[] = []

  try {
    for (const page of pages) {
      const file = byName.get(page.toLowerCase())
      if (!file) {
        const loose = files.find(
          (item) => TEX_EXT.test(item.name) && item.name.toLowerCase().includes(page.toLowerCase().replace(/\.[^.]+$/, '')),
        )
        if (!loose) {
          throw new Error(`Нет файла текстуры для страницы "${page}"`)
        }
        const url = URL.createObjectURL(loose)
        urlsToRevoke.push(url)
        pageUrls[page] = url
        continue
      }
      const url = URL.createObjectURL(file)
      urlsToRevoke.push(url)
      pageUrls[page] = url
    }

    const skeletonUrl = URL.createObjectURL(skeleton)
    const atlasUrl = URL.createObjectURL(new Blob([atlasText], { type: 'text/plain' }))
    urlsToRevoke.push(skeletonUrl, atlasUrl)

    return {
      skeletonUrl,
      atlasUrl,
      pageUrls,
      label: skeleton.name.replace(/\.json$/i, ''),
      animationName: null,
    }
  } catch (err) {
    for (const url of urlsToRevoke) URL.revokeObjectURL(url)
    throw err
  }
}

function StageAssetRow({
  label,
  custom,
  previewUrl,
  onPick,
  onClear,
}: {
  label: string
  custom: boolean
  previewUrl?: string
  onPick: () => void
  onClear: () => void
}) {
  return (
    <li className={custom ? 'stage-asset-row is-custom' : 'stage-asset-row'}>
      <div className="stage-asset-row__thumb">
        {previewUrl ? <img alt="" src={previewUrl} /> : <span>DEF</span>}
      </div>
      <div className="stage-asset-row__meta">
        <strong>{label}</strong>
        <span>{custom ? 'Custom' : 'Default'}</span>
      </div>
      <div className="stage-asset-row__actions">
        <button className="btn" type="button" onClick={onPick}>
          Upload
        </button>
        {custom ? (
          <button className="btn btn--ghost" type="button" onClick={onClear}>
            Reset
          </button>
        ) : null}
      </div>
    </li>
  )
}
