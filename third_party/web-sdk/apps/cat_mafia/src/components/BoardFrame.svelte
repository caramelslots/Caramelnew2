<script lang="ts">
	import { Sprite, Container } from 'pixi-svelte';

	import {
		BOARD_FRAME_OFFSET,
		DESK_PARCHMENT,
		DESK_PARCHMENT_PADDING,
		DESK_VISUAL_OFFSET_Y,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import { catBoardZoom } from '../game/catAnticipationBoardZoom.svelte';

	type Props = {
		/**
		 * `base` — desk fill under the reels.
		 * `overlay` — gold rails with a transparent playfield, drawn above symbols
		 * so spin/land never paints over the frame.
		 */
		layer?: 'base' | 'overlay';
	};

	const props: Props = $props();
	const layer = $derived(props.layer ?? 'base');

	const context = getContext();

	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const boardScale = $derived(boardLayout.scale * catBoardZoom.current);
	const frameX = $derived(boardLayout.pivot.x + BOARD_FRAME_OFFSET.x);
	const frameY = $derived(boardLayout.pivot.y + BOARD_FRAME_OFFSET.y);

	const DESK_SIZE = $derived({
		width: (boardLayout.width * DESK_PARCHMENT_PADDING.width) / DESK_PARCHMENT.widthFrac,
		height: (boardLayout.height * DESK_PARCHMENT_PADDING.height) / DESK_PARCHMENT.heightFrac,
	});

	const deskProps = $derived({
		x: frameX - DESK_PARCHMENT.offsetXFrac * DESK_SIZE.width,
		y: frameY - DESK_PARCHMENT.offsetYFrac * DESK_SIZE.height + DESK_VISUAL_OFFSET_Y,
		anchor: 0.5,
		width: DESK_SIZE.width,
		height: DESK_SIZE.height,
	});
</script>

<Container x={boardLayout.x} y={boardLayout.y} scale={boardScale}>
	<Container x={-boardLayout.pivot.x} y={-boardLayout.pivot.y}>
		{#if layer === 'base'}
			<Sprite key="boardDayBase" {...deskProps} />
		{:else}
			<Sprite key="boardContour" {...deskProps} />
		{/if}
	</Container>
</Container>
