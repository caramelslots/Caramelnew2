<script lang="ts">
	import ReelSymbol from './ReelSymbol.svelte';
	import { getContext } from '../game/context';
	import type { SymbolState } from '../game/types';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import { stateGame } from '../game/stateGame.svelte';

	type ReelLike = {
		reelState: {
			symbols: {
				symbolState: SymbolState;
				rawSymbol: { name: string };
				[key: string]: unknown;
			}[];
			activeSymbolCount: number;
			motion: string;
		};
	};

	type Props = {
		/** When true, render only mystery reveal/collapse VFX (unmasked layer). */
		mysteryFx?: boolean;
		/** When true, render idle-tease / win pops (above the gold rails). */
		idleBounce?: boolean;
		/** When true, render landed PB/PS/PG above the gold rails (not while spinning). */
		pawCoin?: boolean;
		/**
		 * When true, render all resting (non-spinning) tiles above the gold
		 * rails / desk frame so lids, glow and full-column props are not clipped.
		 * Spinning tiles stay on the masked board.
		 */
		fullColumn?: boolean;
		/** Override reel board (Duel dual desks). Defaults to main stateGame.board. */
		board?: ReelLike[];
		/** Duel desk — SW × badge reads that side's sticky map. */
		duelSide?: DuelSide;
	};

	const props: Props = $props();
	const context = getContext();
	const board = $derived(props.board ?? context.stateGame.board);

	const isMysteryFx = (state: SymbolState) =>
		state === 'mysteryReveal' || state === 'mysteryCollapse';

	/** Payline spotlight still holding (base or duel). */
	const spotlightHolding = $derived(
		stateGame.winSpotlightActive || stateDuel.winSpotlightSide != null,
	);

	/**
	 * Target cabinet parks the reels under the desk. Above-rails layers have no
	 * mask — Bonus after activate (postWinStatic) would paint into the street.
	 * Keep every tile on the masked board while the slide/gallery is up.
	 */
	const targetPickParking = $derived(
		stateGame.targetPickOpen || stateGame.targetPickSlide > 0,
	);

	/** SW curtain covers this reel (drop-in / expand / sticky hide). */
	const isReelCoveredBySwCurtain = (reelIndex: number) => {
		if (props.duelSide) {
			return stateDuel.superWildCurtains.some(
				(c) => c.side === props.duelSide && c.reel === reelIndex,
			);
		}
		return (
			stateGame.superWildCurtains.some((c) => c.reel === reelIndex) ||
			stateGame.swSpineHideReels[reelIndex] === true
		);
	};

	/**
	 * Win celebrate + idle tease — above gold rails (BoardIdleBounceLayer).
	 * `win` / `winLift` always lift so H3 flame/rays aren't clipped by dividers.
	 * `postWinStatic` stays above only while spotlight is on — after clear,
	 * celebrate cells snap back to `static` (idle) via clearWinSpotlight.
	 */
	const isAboveRails = (state: SymbolState) =>
		!targetPickParking &&
		(state === 'idleBounce' ||
			state === 'winLift' ||
			state === 'win' ||
			(state === 'postWinStatic' && spotlightHolding));

	const isPawName = (name: string) => name === 'PB' || name === 'PS' || name === 'PG';
	/**
	 * Resting / landing paw above the gold rails.
	 * Stay on the masked board until the reel is fully stopped — during
	 * `bouncing` symbols can still sit past the playfield edge; lifting them
	 * early lets them paint over the desk frame (esp. intermittent in Duel).
	 */
	const isPawCoinAboveFrame = (
		reelSymbol: ReelLike['reelState']['symbols'][number],
		reelMotion: string,
	) =>
		!targetPickParking &&
		isPawName(reelSymbol.rawSymbol.name) &&
		reelSymbol.symbolState !== 'spin' &&
		reelMotion === 'stopped';

	/**
	 * Resting tiles above the gold rails / desk frame (BoardFullColumnLayer).
	 * Only lift once the reel is stopped — `bouncing` still scrolls under the
	 * BoardMask (same as base spin runway). Lifting on `!== spinning` let
	 * mid-settle cells escape the mask and flash outside the desk.
	 * Disabled during target-pick park and while an SW curtain covers the reel
	 * (otherwise a 4-tile stack flashes under the Spine curtain).
	 * Win / idle-bounce / paw layers own their states — excluded here to avoid
	 * double-mounting the same cell.
	 */
	const isFullColumnAboveFrame = (
		reelSymbol: ReelLike['reelState']['symbols'][number],
		reelMotion: string,
		reelIndex: number,
	) => {
		if (targetPickParking || isReelCoveredBySwCurtain(reelIndex)) return false;
		// Never lift painted SW above rails — Spine curtain is the only SW art.
		if (reelSymbol.rawSymbol.name === 'SW') return false;
		if (isMysteryFx(reelSymbol.symbolState)) return false;
		if (isAboveRails(reelSymbol.symbolState)) return false;
		if (isPawCoinAboveFrame(reelSymbol, reelMotion)) return false;
		return reelSymbol.symbolState !== 'spin' && reelMotion === 'stopped';
	};

	const matchesLayer = (
		reelSymbol: ReelLike['reelState']['symbols'][number],
		reelMotion: string,
		reelIndex: number,
	) => {
		const state = reelSymbol.symbolState;
		if (props.mysteryFx) return isMysteryFx(state);
		if (props.idleBounce) return isAboveRails(state);
		if (props.pawCoin) return isPawCoinAboveFrame(reelSymbol, reelMotion);
		if (props.fullColumn) return isFullColumnAboveFrame(reelSymbol, reelMotion, reelIndex);
		return (
			!isMysteryFx(state) &&
			!isAboveRails(state) &&
			!isPawCoinAboveFrame(reelSymbol, reelMotion) &&
			!isFullColumnAboveFrame(reelSymbol, reelMotion, reelIndex)
		);
	};
</script>

{#each board as reel, reelIndex (reelIndex)}
	{#each reel.reelState.symbols as reelSymbol, slotIndex}
		{#if
			slotIndex < reel.reelState.activeSymbolCount &&
			matchesLayer(reelSymbol, reel.reelState.motion, reelIndex)
		}
			<ReelSymbol
				{reelIndex}
				{reelSymbol}
				reelMotion={reel.reelState.motion}
				activeSymbolCount={reel.reelState.activeSymbolCount}
				duelSide={props.duelSide}
			/>
		{/if}
	{/each}
{/each}
