<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { catBoardZoom, startCatBoardZoomRamp, stopCatBoardZoomRamp } from '../game/catAnticipationBoardZoom.svelte';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();

	const context = getContext();
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const boardScale = $derived(boardLayout.scale * catBoardZoom.current);

	$effect(() => {
		if (context.stateGame.catSlowReels.length > 0) {
			startCatBoardZoomRamp();
		} else {
			stopCatBoardZoomRamp();
		}
	});
</script>

<!-- Scale from board center: outer = center point, inner = top-left origin -->
<Container x={boardLayout.x} y={boardLayout.y} scale={boardScale}>
	<Container x={-boardLayout.pivot.x} y={-boardLayout.pivot.y}>
		{@render props.children()}
	</Container>
</Container>
