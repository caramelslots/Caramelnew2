import { QUALITY_PRESETS, type QualityPresetId } from '../../stage/presets'

type QualityPickerProps = {
  value: QualityPresetId
  onChange: (id: QualityPresetId) => void
  compareValue?: QualityPresetId
  onCompareChange?: (id: QualityPresetId) => void
  compareEnabled?: boolean
  onCompareEnabledChange?: (enabled: boolean) => void
}

export function QualityPicker({
  value,
  onChange,
  compareValue = '720p',
  onCompareChange,
  compareEnabled = false,
  onCompareEnabledChange,
}: QualityPickerProps) {
  return (
    <div className="quality-picker" role="group" aria-label="Render quality">
      <div className="quality-picker__head">
        <span className="quality-picker__label">Quality</span>
        <label className="check-field">
          <input
            checked={compareEnabled}
            type="checkbox"
            onChange={(event) => onCompareEnabledChange?.(event.target.checked)}
          />
          <span>Compare A/B</span>
        </label>
      </div>

      <div className="quality-picker__row">
        <span className="quality-picker__side">{compareEnabled ? 'A' : 'Active'}</span>
        <div className="quality-picker__chips">
          {QUALITY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={value === preset.id ? 'quality-chip is-active' : 'quality-chip'}
              type="button"
              title={`Long edge ${preset.longEdge}px`}
              onClick={() => onChange(preset.id)}
            >
              <strong>{preset.label}</strong>
              <span>{preset.longEdge}p</span>
            </button>
          ))}
        </div>
      </div>

      {compareEnabled ? (
        <div className="quality-picker__row">
          <span className="quality-picker__side">B</span>
          <div className="quality-picker__chips">
            {QUALITY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={
                  compareValue === preset.id ? 'quality-chip is-active' : 'quality-chip'
                }
                type="button"
                title={`Long edge ${preset.longEdge}px`}
                onClick={() => onCompareChange?.(preset.id)}
              >
                <strong>{preset.label}</strong>
                <span>{preset.longEdge}p</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
