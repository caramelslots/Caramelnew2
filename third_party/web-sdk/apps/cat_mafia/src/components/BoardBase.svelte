<script lang="ts">
	import ReelSymbol from './ReelSymbol.svelte';
	import { getContext } from '../game/context';
	import { FULL_COLUMN_SYMBOL_NAMES } from '../game/constants';
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
		 * When true, render resting B/W/SW above the gold rails so the outer
		 * frame / rail overlay cannot clip full-column tiles (cols 1 & 5).
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
	 * While the reel is spinning (`spin` / motion spinning) stay on the masked
	 * board so the coin clips away at the playfield edges instead of floating
	 * over the frame into the street.
	 */
	const isPawCoinAboveFrame = (
		reelSymbol: ReelLike['reelState']['symbols'][number],
		reelMotion: string,
	) =>
		!targetPickParking &&
		isPawName(reelSymbol.rawSymbol.name) &&
		reelSymbol.symbolState !== 'spin' &&
		reelMotion !== 'spinning';

	/**
	 * Outer Bonus / Wild / Super Wild only — middle cols stay under rails.
	 * Disabled during target-pick park AND while an SW curtain / hide covers
	 * this reel (otherwise cols 1/5 flash a 4-tile Wild.webp stack).
	 */
	const isFullColumnAboveFrame = (
		reelSymbol: ReelLike['reelState']['symbols'][number],
		reelMotion: string,
		reelIndex: number,
	) => {
		if (targetPickParking || isReelCoveredBySwCurtain(reelIndex)) return false;
		// Never lift painted SW above rails — Spine curtain is the only SW art.
		if (reelSymbol.rawSymbol.name === 'SW') return false;
		return (
			FULL_COLUMN_SYMBOL_NAMES.has(reelSymbol.rawSymbol.name) &&
			(reelIndex === 0 || reelIndex === 4) &&
			reelSymbol.symbolState !== 'spin' &&
			reelMotion !== 'spinning'
		);
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
