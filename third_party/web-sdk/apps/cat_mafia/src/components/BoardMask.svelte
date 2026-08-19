<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { BaseSprite, Rectangle } from 'pixi-svelte';
	import * as PIXI from 'pixi.js';

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

	type BoardLayoutLike = { width: number; height: number };
	type ReelMotionLike = { reelState: { motion: string } };

	type Props = {
		debug?: boolean;
		/** Override — Duel desks pass their layout (width/height in board-local px). */
		layout?: BoardLayoutLike;
		/** Override — Duel desks pass their reel board for spin overflow. */
		board?: ReelMotionLike[];
	};

	const props: Props = $props();
	const context = getContext();
	const layout = $derived(props.layout ?? context.stateGameDerived.boardLayout());
	const reelsActive = $derived(
		props.board
			? props.board.some((reel) => reel.reelState.motion !== 'stopped')
			: context.stateGameDerived.boardReelsActive(),
	);
	const mysteryAnimating = $derived(
		props.board ? false : context.stateGameDerived.boardMysteryAnimating(),
	);
	const mysteryMaskActive = $derived(mysteryAnimating && !reelsActive);
	const maskTopOverflow = $derived(
		!props.board && stateGame.winSpotlightActive
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

	// Own texture per BoardMask instance — dual Duel desks cannot share one
	// Texture as Pixi masks (left desk otherwise clips to ~3 columns).
	let maskTexture = $state<PIXI.Texture>(PIXI.Texture.WHITE);

	$effect(() => {
		const next = createBoardFeatherMaskTexture({
			width: maskWidth,
			height: maskHeight,
			topOverflow: maskTopOverflow,
			bottomOverflow: maskBottomOverflow,
			gridHeight: layout.height,
			feather: BOARD_MASK_FEATHER,
		});
		const prev = untrack(() => maskTexture);
		maskTexture = next;
		if (prev !== next) destroyBoardFeatherMaskTexture(prev);
	});

	onDestroy(() => {
		destroyBoardFeatherMaskTexture(maskTexture);
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
	width={maskWidth}
	height={maskHeight}
	oncreate={(sprite) => {
		sprite.renderable = false;
	}}
/>

{#if props.debug}
	<BaseSprite
		texture={maskTexture}
		x={maskX}
		y={maskY}
		width={maskWidth}
		height={maskHeight}
		alpha={0.35}
	/>
{/if}
