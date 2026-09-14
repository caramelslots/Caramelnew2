<script lang="ts">
	import { Container, Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { drawSuperWildBoardClipMask } from '../game/superWildHtmlSpine';
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

	const slideY = $derived(context.stateGameDerived.targetPickBoardY());
</script>

<Container>
	<Graphics isMask draw={drawSuperWildBoardClipMask} />
	<Container y={slideY}>
		{#each outlineReels as reel (reel.reelIndex)}
			<CatAnticipationOutline {reel} />
		{/each}
	</Container>
</Container>
