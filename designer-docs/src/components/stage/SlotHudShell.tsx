import type { ResolvedStageUrls } from '../../stage/stagePack'

type SlotHudShellProps = {
  urls: ResolvedStageUrls
  orientation: 'landscape' | 'portrait'
  spinning?: boolean
  onSpinClick?: () => void
}

/**
 * Visual HUD chrome. Icons come from stage pack (designer upload or neutral defaults).
 */
export function SlotHudShell({ urls, orientation, spinning, onSpinClick }: SlotHudShellProps) {
  const portrait = orientation === 'portrait'

  return (
    <div
      className={portrait ? 'slot-hud slot-hud--portrait' : 'slot-hud slot-hud--landscape'}
      aria-hidden={onSpinClick ? undefined : true}
    >
      <div className="slot-hud__left">
        <img alt="" className="slot-hud__icon" src={urls.info} />
        <img alt="" className="slot-hud__icon" src={urls.menu} />
        <div className="slot-hud__panel">
          <img alt="Buy bonus" src={urls.buyBonus} />
        </div>
      </div>

      <div className="slot-hud__center">
        <img alt="" className="slot-hud__bet" src={urls.betMinus} />
        <button
          className={spinning ? 'slot-hud__spin is-busy' : 'slot-hud__spin'}
          disabled={spinning || !onSpinClick}
          type="button"
          onClick={onSpinClick}
        >
          <img alt="Spin" src={urls.spin} />
        </button>
        <img alt="" className="slot-hud__bet" src={urls.betPlus} />
      </div>

      <div className="slot-hud__right">
        <div className="slot-hud__cash">
          <p>
            <span>BALANCE</span>
            <strong>$1,000.00</strong>
          </p>
          <p>
            <span>BET</span>
            <strong>$1.00</strong>
          </p>
        </div>
        <div className="slot-hud__panel slot-hud__panel--auto">
          <img alt="Autoplay" src={urls.autoplay} />
        </div>
        <img alt="" className="slot-hud__icon slot-hud__icon--turbo" src={urls.turbo} />
      </div>
    </div>
  )
}
