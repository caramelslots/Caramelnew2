<script lang="ts">
	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { getCatAnticipationFrameMetrics } from '../game/catAnticipation';
	import CatAnticipationFrame from './CatAnticipationFrame.svelte';

	const context = getContext();

	const frameMetrics = getCatAnticipationFrameMetrics();

	const slowSpinningReels = $derived(
		context.stateGame.board.filter(
			(reel, reelIndex) =>
				context.stateGame.catSlowReels.includes(reelIndex) && reel.reelState.motion === 'spinning',
		),
	);
</script>

{#each slowSpinningReels as reel (reel.reelIndex)}
	<CatAnticipationFrame
		x={getSymbolX(reel.reelIndex)}
		y={frameMetrics.centerY}
		width={frameMetrics.width}
		height={frameMetrics.height}
	/>
{/each}
