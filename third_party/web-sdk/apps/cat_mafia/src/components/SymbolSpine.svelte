<script lang="ts">
	import type { SpineTrackProps } from 'pixi-svelte';

	import { getSymbolInfo } from '../game/utils';
	import type { SymbolName } from '../game/types';
	import SymbolSpineMain from './SymbolSpineMain.svelte';

	type Props = {
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		symbolName: SymbolName;
		x?: number;
		y?: number;
		listener: SpineTrackProps['listener'];
		loop?: boolean;
		inViewport?: boolean;
	};

	const props: Props = $props();
</script>

<SymbolSpineMain
	x={props.x}
	y={props.y}
	symbolInfo={props.symbolInfo}
	symbolName={props.symbolName}
	inViewport={props.inViewport}
	listener={props.listener}
	loop={props.loop}
/>
