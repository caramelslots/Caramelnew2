<script lang="ts">
	import { SpineProvider, SpineTrack, type SpineTrackProps } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';

	type Props = {
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		x?: number;
		y?: number;
		listener: SpineTrackProps['listener'];
		loop?: boolean;
	};

	const props: Props = $props();

	// Idle clips (B `Special_1/idle`, M `Mystery/idle`) are zero-movement rest
	// poses — they only need to be applied once. Freezing them (autoUpdate=false)
	// stops the Pixi ticker from recomputing the skeleton every frame for every
	// resting/scrolling B/M cell, which is pure waste. Animated clips
	// (bounce/wave/win/explosion) keep autoUpdate=true.
	const autoUpdate = $derived(!props.symbolInfo.animationName?.endsWith('/idle'));
</script>

<SpineProvider
	x={props.x}
	y={props.y}
	key={props.symbolInfo.assetKey}
	height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height}
	{autoUpdate}
>
	<SpineTrack
		loop={props.loop}
		trackIndex={0}
		animationName={props.symbolInfo.animationName}
		timeScale={stateBetDerived.timeScale()}
		listener={props.listener}
	/>
</SpineProvider>
