import type { AnimationRole, AnimationRoleMap } from '../../types'
import { ROLE_LABELS } from '../../pixi/animationRoles'

type AnimationControlsProps = {
  animationNames: string[]
  roles: AnimationRoleMap
  activeAnimation: string | null
  loop: boolean
  speed: number
  disabled?: boolean
  /** Skip outer panel chrome when nested inside another card. */
  embedded?: boolean
  titleId?: string
  onPlayRole: (role: AnimationRole) => void
  onSelectAnimation: (name: string) => void
  onLoopChange: (loop: boolean) => void
  onSpeedChange: (speed: number) => void
}

const ROLES: AnimationRole[] = ['idle', 'bounce', 'win']

export function AnimationControls({
  animationNames,
  roles,
  activeAnimation,
  loop,
  speed,
  disabled,
  embedded = false,
  titleId = 'anim-controls-title',
  onPlayRole,
  onSelectAnimation,
  onLoopChange,
  onSpeedChange,
}: AnimationControlsProps) {
  return (
    <section
      className={embedded ? 'anim-controls anim-controls--embedded' : 'panel-block'}
      aria-labelledby={titleId}
    >
      <div className={embedded ? 'anim-controls__head' : 'panel-block__head'}>
        <h2 id={titleId}>Animations</h2>
        <p>Idle / Bounce / Win — click again to replay (useful with Loop off)</p>
      </div>

      <div className="role-grid">
        {ROLES.map((role) => {
          const clip = roles[role]
          const isActive = Boolean(clip && activeAnimation === clip)
          return (
            <button
              key={role}
              className={isActive ? 'btn role-btn is-active' : 'btn role-btn'}
              disabled={disabled || !clip}
              title={
                clip
                  ? activeAnimation === clip
                    ? `Replay “${clip}”`
                    : `Play “${clip}”`
                  : 'Clip not found'
              }
              type="button"
              onClick={() => onPlayRole(role)}
            >
              <strong>{ROLE_LABELS[role]}</strong>
              <span>{clip ?? 'missing'}</span>
            </button>
          )
        })}
      </div>

      <label className="field">
        <span>All animations</span>
        <select
          disabled={disabled || animationNames.length === 0}
          value={activeAnimation ?? ''}
          onChange={(event) => onSelectAnimation(event.target.value)}
        >
          {animationNames.length === 0 ? <option value="">No clips</option> : null}
          {animationNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className="playback-row">
        <label className="check-field">
          <input
            checked={loop}
            disabled={disabled}
            type="checkbox"
            onChange={(event) => onLoopChange(event.target.checked)}
          />
          <span>Loop</span>
        </label>

        <label className="field field--inline">
          <span>Speed {speed.toFixed(1)}×</span>
          <input
            disabled={disabled}
            max={2}
            min={0.25}
            step={0.25}
            type="range"
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          />
        </label>
      </div>
    </section>
  )
}
