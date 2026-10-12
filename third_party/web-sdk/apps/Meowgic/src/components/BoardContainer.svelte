<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { catBoardZoom, startCatBoardZoomRamp, stopCatBoardZoomRamp } from '../game/catAnticipationBoardZoom.svelte';

	type BoardLayout = {
		x: number;
		y: number;
		scale: number;
		pivot: { x: number; y: number };
	};

	type Props = {
		children: Snippet;
		/** Override — used by Duel dual desks. Defaults to main boardLayout(). */
		layout?: BoardLayout;
		/** Disable cat anticipation zoom (Duel boards). */
		disableCatZoom?: boolean;
	};

	const props: Props = $props();

	const context = getContext();
	const boardLayout = $derived(props.layout ?? context.stateGameDerived.boardLayout());
	const boardScale = $derived(
		boardLayout.scale * (props.disableCatZoom ? 1 : catBoardZoom.current),
	);

	$effect(() => {
		if (props.disableCatZoom) return;
		if (context.stateGame.catSlowReels.length > 0) {
			startCatBoardZoomRamp();
		} else {
			stopCatBoardZoomRamp();
		}
	});
</script>

<!-- Scale from board center: outer = center point, inner = top-left origin -->
<Container x={boardLayout.x} y={boardLayout.y} scale={boardScale}>
	<Container x={-boardLayout.pivot.x} y={-boardLayout.pivot.y} sortableChildren={true}>
		{@render props.children()}
	</Container>
</Container>
