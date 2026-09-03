<script lang="ts">
	import { getContext } from '../game/context';
	import CatAnticipationOutline from './CatAnticipationOutline.svelte';
	import { devPreview } from '../game/devPreview.svelte';

	const context = getContext();

	const slowReels = $derived(
		context.stateGame.board.filter((reel, reelIndex) =>
			context.stateGame.catSlowReels.includes(reelIndex),
		),
	);

	const outlineReels = $derived(
		devPreview.forceShowBonusReelAllColumns
			? context.stateGame.board
			: slowReels.filter(
					(reel) =>
						reel.reelState.motion === 'spinning' || reel.reelState.motion === 'bouncing',
				),
	);
</script>

{#each outlineReels as reel (reel.reelIndex)}
	<CatAnticipationOutline {reel} />
{/each}
