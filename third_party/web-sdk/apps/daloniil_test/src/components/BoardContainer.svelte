<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();

	const context = getContext();
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
</script>

<!-- Scale from board center: outer = center point, inner = top-left origin -->
<Container x={boardLayout.x} y={boardLayout.y} scale={boardLayout.scale}>
	<Container x={-boardLayout.pivot.x} y={-boardLayout.pivot.y}>
		{@render props.children()}
	</Container>
</Container>
