<script lang="ts">
	import { SpineProvider } from 'pixi-svelte';

	import type { DeskCanvasBounds } from '../game/neonBoardAlignment';
	import NeonBackgroundSpineController from './NeonBackgroundSpineController.svelte';

	type Props = {
		skin: 'day' | 'night';
		layer?: 'behind' | 'front';
		boardBounds?: import('../game/neonBoardAlignment').BoardCanvasBounds;
		x: number;
		y: number;
		width: number;
		height: number;
	};

	const props: Props = $props();
</script>

<SpineProvider
	key="neonBackground"
	x={props.x}
	y={props.y}
	width={props.width}
	height={props.height}
	anchor={0.5}
>
	<NeonBackgroundSpineController
		skin={props.skin}
		layer={props.layer ?? 'behind'}
		boardBounds={props.boardBounds}
		overlayX={props.x}
		overlayY={props.y}
		overlayWidth={props.width}
		overlayHeight={props.height}
	/>
</SpineProvider>
