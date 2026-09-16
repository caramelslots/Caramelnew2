import { DEVICE_PRESETS, type DevicePresetId } from '../../stage/presets'

type DevicePickerProps = {
  value: DevicePresetId
  onChange: (id: DevicePresetId) => void
}

const LANDSCAPE = DEVICE_PRESETS.filter((item) => item.orientation === 'landscape')
const PORTRAIT = DEVICE_PRESETS.filter((item) => item.orientation === 'portrait')

export function DevicePicker({ value, onChange }: DevicePickerProps) {
  return (
    <div className="device-picker" role="group" aria-label="Device viewport">
      <div className="device-picker__group">
        <span className="device-picker__label">Landscape</span>
        <div className="device-picker__chips">
          {LANDSCAPE.map((preset) => (
            <button
              key={preset.id}
              className={value === preset.id ? 'device-chip is-active' : 'device-chip'}
              type="button"
              title={`${preset.width}×${preset.height}`}
              onClick={() => onChange(preset.id)}
            >
              <strong>{preset.label}</strong>
              <span>
                {preset.width}×{preset.height}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="device-picker__group">
        <span className="device-picker__label">Portrait</span>
        <div className="device-picker__chips">
          {PORTRAIT.map((preset) => (
            <button
              key={preset.id}
              className={value === preset.id ? 'device-chip is-active' : 'device-chip'}
              type="button"
              title={`${preset.width}×${preset.height}`}
              onClick={() => onChange(preset.id)}
            >
              <strong>{preset.label}</strong>
              <span>
                {preset.width}×{preset.height}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
