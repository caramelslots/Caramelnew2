<script lang="ts">
	import { onDestroy } from 'svelte';
	import { BaseSprite, Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		SYMBOL_SIZE,
		BOARD_MASK_OVERFLOW,
		BOARD_MASK_SPIN_OVERFLOW,
		BOARD_MASK_WIN_BOUNCE_TOP,
		BOARD_MASK_MYSTERY_OVERFLOW,
		BOARD_MASK_FEATHER,
	} from '../game/constants';
	import {
		createBoardFeatherMaskTexture,
		destroyBoardFeatherMaskTexture,
	} from '../game/boardFeatherMask';
	import { stateGame } from '../game/stateGame.svelte';

	type Props = { debug?: boolean };

	const props: Props = $props();
	const context = getContext();
	const layout = $derived(context.stateGameDerived.boardLayout());
	const reelsActive = $derived(context.stateGameDerived.boardReelsActive());
	const mysteryAnimating = $derived(context.stateGameDerived.boardMysteryAnimating());
	const mysteryMaskActive = $derived(mysteryAnimating && !reelsActive);
	const maskTopOverflow = $derived(
		stateGame.winSpotlightActive
			? BOARD_MASK_WIN_BOUNCE_TOP
			: mysteryMaskActive
				? BOARD_MASK_MYSTERY_OVERFLOW
				: reelsActive
					? BOARD_MASK_SPIN_OVERFLOW.top
					: BOARD_MASK_OVERFLOW.top,
	);
	const maskBottomOverflow = $derived(
		mysteryMaskActive
			? BOARD_MASK_MYSTERY_OVERFLOW
			: reelsActive
				? BOARD_MASK_SPIN_OVERFLOW.bottom
				: BOARD_MASK_OVERFLOW.bottom,
	);

	const maskX = $derived(-SYMBOL_SIZE);
	const maskY = $derived(-maskTopOverflow);
	const maskWidth = $derived(layout.width + SYMBOL_SIZE * 2);
	const maskHeight = $derived(layout.height + maskTopOverflow + maskBottomOverflow);

	const maskTexture = $derived.by(() =>
		createBoardFeatherMaskTexture({
			width: maskWidth,
			height: maskHeight,
			topOverflow: maskTopOverflow,
			bottomOverflow: maskBottomOverflow,
			gridHeight: layout.height,
			feather: BOARD_MASK_FEATHER,
		}),
	);

	onDestroy(() => {
		destroyBoardFeatherMaskTexture();
	});
</script>

{#if props.debug}
	<Rectangle
		alpha={0.5}
		backgroundColor={0xffffff}
		width={layout.width}
		height={layout.height}
	/>
{/if}

<BaseSprite
	isMask
	texture={maskTexture}
	x={maskX}
	y={maskY}
	oncreate={(sprite) => {
		sprite.renderable = false;
	}}
/>

{#if props.debug}
	<BaseSprite texture={maskTexture} x={maskX} y={maskY} alpha={0.35} />
{/if}
