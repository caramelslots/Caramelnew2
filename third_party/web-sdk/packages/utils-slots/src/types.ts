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
	 * After `readyToSpin` fires, keep scrolling this many symbol rows per loop
	 * WITHOUT `preSpinPadding` (no placeY snap upward). Opt-in for games that
	 * need continuous motion during the RGS round-trip. Standard SDK apps
	 * (lines/price/ways) omit this and use the padding loop instead.
	 */
	reelPreSpinHoldRotations?: number;
	/**
	 * Whether the first pre-spin slide winds up with `backIn` easing (a slight
	 * dip-back then a burst past the steady speed). Defaults to `true` (legacy
	 * behavior). Set `false` to start the spin at a constant speed — useful
	 * when the wind-up burst reads as the whole slot "surging" to swap symbols.
	 */
	reelPreSpinWindup?: boolean;
	/**
	 * Whether the main spin starts seamlessly by injecting the result + padding
	 * ABOVE the symbols currently on screen (which keep their place) and scrolling
	 * them in, instead of teleporting the reel to a fresh padded stack. Defaults
	 * to `false` (legacy teleport). Set `true` to avoid the visible "symbols
	 * swap in place on the board" artifact at the pre-spin → result handoff.
	 */
	reelSeamlessSpinStart?: boolean;
	/**
	 * EXACT number of symbol rows the main spin scrolls on reel 0 (the first
	 * column), when `reelSeamlessSpinStart` is on. Each later reel adds the
	 * padding accumulated from previous reels for the left-to-right stop cascade.
	 *
	 * This is the direct "how many rotations" knob: with the seamless start the
	 * scroll distance is otherwise dominated by a fixed floor (pre-spin park
	 * depth + the injected result block), which is why `reelPaddingMultiplierNormal`
	 * barely changes the first column. Lower = fewer rotations for every column;
	 * the visible symbols still keep their place (no in-place swap). Leave
	 * undefined to keep the legacy seamless behavior (distance = pre-spin depth +
	 * result block + padding).
	 */
	reelMainSpinRows?: number;
	/**
	 * Max |reelY − defaultY| (in symbol rows) for the controlled `reelMainSpinRows`
	 * handoff. Beyond this (e.g. after `reelPreSpinHoldRotations` drift) the legacy
	 * seamless prepend is used so visible symbols are not re-aligned with a snap.
	 * Defaults to 1 row.
	 */
	reelMainSpinParkSlackRows?: number;
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
	 * Fixed total duration (ms) of the bounce-back settle. When set, the rebound
	 * lasts exactly this long regardless of `reelBounceBackSpeed` (which is then
	 * ignored for the settle). For the two-stage settle the time is split between
	 * stages by travel distance so the motion stays continuous. Leave undefined to
	 * keep the speed-derived timing.
	 */
	reelSettleDurationMs?: number;
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
	onSymbolLand: (args: {
		rawSymbol: TRawSymbol;
		/** Index in the settled reel pool (0 = top padding when padded). */
		symbolIndex?: number;
		/** Active pool length at land time — distinguishes padded vs compact boards. */
		activeSymbolCount?: number;
	}) => void;
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
