import type { FirstArgOf } from 'utils-shared/types';

import type { createReelForSpinning } from './createReelForSpinning.svelte';
import type { createReelForCascading } from './createReelForCascading.svelte';

export type SpinType = 'normal' | 'fast' | 'anticipated';

export type SpinningReelSpinOptions = {
	// speed (pixel / ms)
	reelPreSpinSpeed: number;
	reelBounceBackSpeed: number;
	reelSpinSpeed: number;
	reelSpinSpeedBeforeBounce: number;
	// size
	reelBounceSizeMulti: number;
	// extra padding
	reelPaddingMultiplierNormal: number;
	reelPaddingMultiplierAnticipated: number;
	reelSpinDelay: number;
	/** Symbol heights on the main spin slide (overrides defaultY × padding when set). */
	reelSpinRotations?: number;
	/** Symbol heights per pre-spin loop (default: full slide to defaultY). */
	reelPreSpinRotations?: number;
	/**
	 * Optional damped-oscillation settle.
	 *
	 * When set, after the reel snaps to `defaultY + bounceSize` (initial overshoot
	 * past final position), it does TWO eases instead of one:
	 *   1. ease UP past final position to `defaultY − bounceSize × reelSettleSecondaryMulti`
	 *      (secondary overshoot — the visible "rebound").
	 *   2. ease DOWN to `defaultY` at `reelBounceBackSpeed × reelSettleSecondarySpeedMulti`.
	 *
	 * Leave undefined to keep the legacy single-ease bounce-back (no behavior
	 * change for callers that don't opt in).
	 */
	reelSettleSecondaryMulti?: number;
	reelSettleSecondarySpeedMulti?: number;
	/**
	 * Optional vertical squash on landing (Y-axis only by default; X can
	 * stretch in sync via `reelLandSquashStretchMulti`).
	 *
	 * When `reelLandSquashY` < 1, all symbols on the reel snap to scaleY =
	 * `reelLandSquashY` at the moment the reel hits its initial overshoot,
	 * then ease back to scaleY = 1 over `reelLandSquashRecoveryMs` with
	 * sineOut.
	 *
	 * Pivots around each symbol's centre (anchor = 0.5), so vertical position
	 * does not shift — the symbol just compresses → springs back.
	 *
	 * `reelLandSquashStretchMulti` (0..~1.0) ties horizontal stretch to the
	 * current vertical squash for a jelly / volume-preservation feel:
	 *   scaleX = 1 + (1 − scaleY) × reelLandSquashStretchMulti
	 * 0 = no stretch (pure Y squash), 0.5 ≈ subtle jelly, 1.0 ≈ true area
	 * preservation. The X stretch is fully driven by the Y Tween, so the
	 * two axes are perfectly synchronised on snap, easing and recovery.
	 *
	 * Leave undefined / 1 to disable.
	 */
	reelLandSquashY?: number;
	reelLandSquashRecoveryMs?: number;
	reelLandSquashStretchMulti?: number;
};

export type CascadingReelSpinOptions = {
	// speed (pixel / ms) and intervals(ms) between reels/symbols
	symbolFallInSpeed: number;
	symbolFallInInterval: number;
	symbolFallInBounceSpeed: number;
	symbolFallInBounceSizeMulti: number;
	symbolFallOutSpeed: number;
	symbolFallOutInterval: number;
	// reel
	reelFallInDelay: number;
	// extra padding
	reelPaddingMultiplierNormal: number;
	reelPaddingMultiplierAnticipated: number;
	reelFallOutDelay: number;
};

type ReelCreateOptions<TRawSymbol extends object, TSymbolState extends string> = {
	initialSymbols: TRawSymbol[];
	initialSymbolState: TSymbolState;
	reelIndex: number;
	symbolHeight: number;
	onReelStopping: () => void;
	onSymbolLand: (args: { rawSymbol: TRawSymbol }) => void;
};

export type SpinningReelCreateOptions<
	TRawSymbol extends object,
	TSymbolState extends string,
> = ReelCreateOptions<TRawSymbol, TSymbolState>;

export type CascadingReelCreateOptions<
	TRawSymbol extends object,
	TSymbolState extends string,
> = ReelCreateOptions<TRawSymbol, TSymbolState>;

export type SpinningReel<TRawSymbol extends object, TSymbolState extends string> = ReturnType<
	typeof createReelForSpinning<TRawSymbol, TSymbolState>
>;
export type CascadingReel<TRawSymbol extends object, TSymbolState extends string> = ReturnType<
	typeof createReelForCascading<TRawSymbol, TSymbolState>
>;

export type Reel<TRawSymbol extends object, TSymbolState extends string> =
	| SpinningReel<TRawSymbol, TSymbolState>
	| CascadingReel<TRawSymbol, TSymbolState>;

export type FallOptionsTurbo = {
	fallInSpeedTurbo: number;
	fallInIntervalTurbo: number;
	fallInBounceTurbo: number;
	fallInBounceDistanceTurbo: number;

	fallOutSpeedTurbo: number;
	fallOutIntervalTurbo: number;
};

export type GetRawSymbolFromReel<TReel extends Reel<any, any>> = NonNullable<
	FirstArgOf<TReel['setSymbolsWithRawSymbols']>
>[number];
