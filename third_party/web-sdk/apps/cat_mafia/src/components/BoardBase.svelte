<script lang="ts">
	import ReelSymbol from './ReelSymbol.svelte';
	import { getContext } from '../game/context';
	import type { SymbolState } from '../game/types';
	import type { DuelSide } from '../game/stateDuel.svelte';

	type ReelLike = {
		reelState: {
			symbols: { symbolState: SymbolState; [key: string]: unknown }[];
			activeSymbolCount: number;
			motion: string;
		};
	};

	type Props = {
		/** When true, render only mystery reveal/collapse VFX (unmasked layer). */
		mysteryFx?: boolean;
		/** When true, render only idle-tease pops (above the gold rails). */
		idleBounce?: boolean;
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

	const matchesLayer = (state: SymbolState) => {
		if (props.mysteryFx) return isMysteryFx(state);
		if (props.idleBounce) return isIdleBounce(state);
		return !isMysteryFx(state) && !isIdleBounce(state);
	};
</script>

{#each board as reel, reelIndex (reelIndex)}
	{#each reel.reelState.symbols as reelSymbol, slotIndex}
		{#if slotIndex < reel.reelState.activeSymbolCount && matchesLayer(reelSymbol.symbolState)}
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
