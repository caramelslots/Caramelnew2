<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		SYMBOL_SIZE,
		BOARD_MASK_OVERFLOW,
		BOARD_MASK_SPIN_OVERFLOW,
		BOARD_MASK_WIN_BOUNCE_TOP,
		BOARD_MASK_IDLE_BOUNCE_TOP,
		BOARD_MASK_MYSTERY_OVERFLOW,
	} from '../game/constants';
	import { stateGame } from '../game/stateGame.svelte';

	type Props = { debug?: boolean };

	const props: Props = $props();
	const context = getContext();
	const layout = $derived(context.stateGameDerived.boardLayout());
	const reelsActive = $derived(context.stateGameDerived.boardReelsActive());
	const mysteryAnimating = $derived(context.stateGameDerived.boardMysteryAnimating());
	const idleBouncing = $derived(context.stateGameDerived.boardIdleBouncing());
	// Mystery VFX needs extra mask runway, but only while reels are stopped —
	// during collapse+spin a global top/bottom overflow would expose scrolling
	// symbols from other columns above/below the frame.
	const mysteryMaskActive = $derived(mysteryAnimating && !reelsActive);
	const maskTopOverflow = $derived(
		stateGame.winSpotlightActive
			? BOARD_MASK_WIN_BOUNCE_TOP
			: idleBouncing
				? BOARD_MASK_IDLE_BOUNCE_TOP
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
</script>

{#if props.debug}
	<Rectangle
		alpha={0.5}
		backgroundColor={0xffffff}
		width={layout.width}
		height={layout.height}
	/>
{/if}

<Rectangle
	isMask
	x={-SYMBOL_SIZE}
	y={-maskTopOverflow}
	width={layout.width + SYMBOL_SIZE * 2}
	height={layout.height + maskTopOverflow + maskBottomOverflow}
/>
