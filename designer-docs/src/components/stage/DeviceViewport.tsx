import { useEffect, useRef, useState, type ReactNode } from 'react'
import { computeDeviceFit, type DeviceFit } from '../../stage/deviceFit'
import type { DevicePreset } from '../../stage/presets'

type DeviceViewportProps = {
  device: DevicePreset
  qualityLabel: string
  density: number
  children: ReactNode
}

/**
 * Fits the logical device frame into the available wrap (contain),
 * so Desktop / Popout S / Mobile all read as different window sizes.
 */
export function DeviceViewport({
  device,
  qualityLabel,
  density,
  children,
}: DeviceViewportProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<DeviceFit>(() =>
    computeDeviceFit({ width: device.width, height: device.height }, device),
  )

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const update = () => {
      const rect = wrap.getBoundingClientRect()
      setFit(
        computeDeviceFit(
          { width: rect.width, height: rect.height },
          device,
        ),
      )
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [device])

  return (
    <div className="reel-lab__viewport-wrap" ref={wrapRef}>
      <div
        className={
          device.orientation === 'portrait'
            ? 'device-frame device-frame--portrait'
            : 'device-frame device-frame--landscape'
        }
        style={{
          width: fit.displayWidth,
          height: fit.displayHeight,
        }}
      >
        <div className="device-frame__chrome">
          <span>
            {device.label} · {device.width}×{device.height}
            {fit.fitScale < 0.999 ? ` · fit ${(fit.fitScale * 100).toFixed(0)}%` : ''}
          </span>
          <span>
            {qualityLabel} · dens {density.toFixed(2)}×
          </span>
        </div>
        <div className="device-frame__stage device-frame__stage--live">{children}</div>
      </div>
    </div>
  )
}
