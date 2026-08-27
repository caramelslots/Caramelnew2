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
	 * Win celebrate + idle tease — above gold rails (BoardIdleBounceLayer).
	 * `win` / `winLift` always lift so H3 flame/rays aren't clipped by dividers.
	 * `postWinStatic` stays above only while spotlight is on — after clear,
	 * celebrate cells snap back to `static` (idle) via clearWinSpotlight.
	 */
	const isAboveRails = (state: SymbolState) =>
		state === 'idleBounce' ||
		state === 'winLift' ||
		state === 'win' ||
		(state === 'postWinStatic' && spotlightHolding);

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
		isPawName(reelSymbol.rawSymbol.name) &&
		reelSymbol.symbolState !== 'spin' &&
		reelMotion !== 'spinning';

	const matchesLayer = (
		reelSymbol: ReelLike['reelState']['symbols'][number],
		reelMotion: string,
	) => {
		const state = reelSymbol.symbolState;
		if (props.mysteryFx) return isMysteryFx(state);
		if (props.idleBounce) return isAboveRails(state);
		if (props.pawCoin) return isPawCoinAboveFrame(reelSymbol, reelMotion);
		return (
			!isMysteryFx(state) &&
			!isAboveRails(state) &&
			!isPawCoinAboveFrame(reelSymbol, reelMotion)
		);
	};
</script>

{#each board as reel, reelIndex (reelIndex)}
	{#each reel.reelState.symbols as reelSymbol, slotIndex}
		{#if
			slotIndex < reel.reelState.activeSymbolCount &&
			matchesLayer(reelSymbol, reel.reelState.motion)
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
