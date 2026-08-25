import { QUALITY_PRESETS, type QualityPresetId } from '../../stage/presets'

type QualityPickerProps = {
  value: QualityPresetId
  onChange: (id: QualityPresetId) => void
}

export function QualityPicker({ value, onChange }: QualityPickerProps) {
  return (
    <div className="quality-picker">
      <div className="quality-picker__grid">
        {QUALITY_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={value === preset.id ? 'quality-chip is-active' : 'quality-chip'}
            type="button"
            onClick={() => onChange(preset.id)}
          >
            <strong>{preset.label}</strong>
            <span>{preset.longEdge}px</span>
          </button>
        ))}
      </div>
    </div>
  )
}
