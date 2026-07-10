<script lang="ts">
	import { getContext } from '../game/context';
	import CatAnticipationOutline from './CatAnticipationOutline.svelte';

	const context = getContext();

	const slowReels = $derived(
		context.stateGame.board.filter((reel, reelIndex) =>
			context.stateGame.catSlowReels.includes(reelIndex),
		),
	);
</script>

{#each slowReels as reel (reel.reelIndex)}
	{#if reel.reelState.motion === 'spinning' || reel.reelState.motion === 'bouncing'}
		<CatAnticipationOutline {reel} />
	{/if}
{/each}
