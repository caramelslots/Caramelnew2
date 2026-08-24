<script lang="ts">
	import ReelSymbol from './ReelSymbol.svelte';
	import { getContext } from '../game/context';
	import type { SymbolState } from '../game/types';
	import type { DuelSide } from '../game/stateDuel.svelte';

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
		/** When true, render only idle-tease pops (above the gold rails). */
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
	const isIdleBounce = (state: SymbolState) => state === 'idleBounce';
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
		if (props.idleBounce) return isIdleBounce(state);
		if (props.pawCoin) return isPawCoinAboveFrame(reelSymbol, reelMotion);
		return (
			!isMysteryFx(state) &&
			!isIdleBounce(state) &&
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
