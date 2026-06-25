<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		SYMBOL_SIZE,
		BOARD_MASK_OVERFLOW,
		BOARD_MASK_SPIN_OVERFLOW,
		BOARD_MASK_WIN_BOUNCE_TOP,
	} from '../game/constants';
	import { stateGame } from '../game/stateGame.svelte';

	type Props = { debug?: boolean };

	const props: Props = $props();
	const context = getContext();
	const layout = $derived(context.stateGameDerived.boardLayout());
	const reelsActive = $derived(context.stateGameDerived.boardReelsActive());
	const maskTopOverflow = $derived(
		stateGame.winSpotlightActive ? BOARD_MASK_WIN_BOUNCE_TOP : BOARD_MASK_OVERFLOW.top,
	);
	const maskBottomOverflow = $derived(
		reelsActive ? BOARD_MASK_SPIN_OVERFLOW.bottom : BOARD_MASK_OVERFLOW.bottom,
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
