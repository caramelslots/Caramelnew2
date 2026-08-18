<script lang="ts">
	import ReelSymbol from './ReelSymbol.svelte';
	import { getContext } from '../game/context';
	import type { SymbolState } from '../game/types';

	type Props = {
		/** When true, render only mystery reveal/collapse VFX (unmasked layer). */
		mysteryFx?: boolean;
		/** When true, render only idle-tease pops (above the gold rails). */
		idleBounce?: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	const isMysteryFx = (state: SymbolState) =>
		state === 'mysteryReveal' || state === 'mysteryCollapse';
	const isIdleBounce = (state: SymbolState) => state === 'idleBounce';

	const matchesLayer = (state: SymbolState) => {
		if (props.mysteryFx) return isMysteryFx(state);
		if (props.idleBounce) return isIdleBounce(state);
		return !isMysteryFx(state) && !isIdleBounce(state);
	};
</script>

{#each context.stateGame.board as reel, reelIndex (reelIndex)}
	{#each reel.reelState.symbols as reelSymbol}
		{#if matchesLayer(reelSymbol.symbolState)}
			<ReelSymbol {reelIndex} {reelSymbol} />
		{/if}
	{/each}
{/each}
