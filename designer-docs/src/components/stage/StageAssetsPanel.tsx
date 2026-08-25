import { useId, useRef } from 'react'
import { getDefaultStageUrls } from '../../stage/defaultStageUrls'
import {
  STAGE_SLOT_META,
  type StagePackOverrides,
  type StageSlotId,
} from '../../stage/stagePack'

type StageAssetsPanelProps = {
  overrides: StagePackOverrides
  onChange: (next: StagePackOverrides) => void
}

export function StageAssetsPanel({ overrides, onChange }: StageAssetsPanelProps) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingSlot = useRef<StageSlotId | null>(null)
  const defaults = getDefaultStageUrls()

  const setSlot = (id: StageSlotId, url: string | null) => {
    const next = { ...overrides }
    if (url) next[id] = url
    else delete next[id]
    onChange(next)
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

  const env = STAGE_SLOT_META.filter((item) => item.group === 'environment')
  const hud = STAGE_SLOT_META.filter((item) => item.group === 'hud')

  return (
    <section className="panel-block stage-assets-panel">
      <div className="panel-block__head">
        <h2>Stage assets</h2>
        <p>Свои фон / desk / HUD. Пусто = нейтральный default (не cat_mafia).</p>
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

      <p className="stage-assets-panel__group">HUD</p>
      <ul className="stage-asset-list">
        {hud.map((slot) => (
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
