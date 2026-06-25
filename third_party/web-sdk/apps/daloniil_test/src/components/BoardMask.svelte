<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_MASK_OVERFLOW, BOARD_MASK_WIN_BOUNCE_TOP } from '../game/constants';
	import { stateGame } from '../game/stateGame.svelte';

	type Props = { debug?: boolean };

	const props: Props = $props();
	const context = getContext();
	const layout = $derived(context.stateGameDerived.boardLayout());
	const maskTopOverflow = $derived(
		stateGame.winSpotlightActive ? BOARD_MASK_WIN_BOUNCE_TOP : BOARD_MASK_OVERFLOW.top,
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
	height={layout.height + maskTopOverflow + BOARD_MASK_OVERFLOW.bottom}
/>
