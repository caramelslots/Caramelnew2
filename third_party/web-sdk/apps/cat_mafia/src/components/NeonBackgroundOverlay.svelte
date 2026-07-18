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
		scale: number;
		started: boolean;
	};

	const props: Props = $props();
</script>

<!-- anchor не передаётся (=0): Spine (0,0) = (x, y) в canvas-координатах.
     Это даёт линейное масштабирование при ресайзе (без квадратичного drift). -->
<SpineProvider
	key="neonBackground"
	x={props.x}
	y={props.y}
	scale={props.scale}
>
	<NeonBackgroundSpineController
		skin={props.skin}
		layer={props.layer ?? 'behind'}
		boardBounds={props.boardBounds}
		overlayX={props.x}
		overlayY={props.y}
		overlayScale={props.scale}
		started={props.started}
	/>
</SpineProvider>
