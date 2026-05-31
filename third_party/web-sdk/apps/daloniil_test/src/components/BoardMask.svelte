<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	type Props = { debug?: boolean };

	const props: Props = $props();
	const context = getContext();
	const layout = $derived(context.stateGameDerived.boardLayout());
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
	width={layout.width + SYMBOL_SIZE * 2}
	height={layout.height}
/>
