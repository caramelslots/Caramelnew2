<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';

	import { boardReactionPose, getBoardReactionPivot } from '../game/boardReactionPose.svelte';
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
	/** Same origin and factor as the desk spine's `main_board` reaction scale. */
	const reactionScale = $derived(boardReactionPose.scale);
	const reactionPivot = $derived(getBoardReactionPivot(boardLayout));

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
		<!-- Spin reaction: grow around the same bone the desk spine scales. -->
		<Container x={reactionPivot.x} y={reactionPivot.y} scale={reactionScale}>
			<Container x={-reactionPivot.x} y={-reactionPivot.y} sortableChildren={true}>
				{@render props.children()}
			</Container>
		</Container>
	</Container>
</Container>
