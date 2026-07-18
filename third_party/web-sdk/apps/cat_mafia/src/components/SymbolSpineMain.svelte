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

	// `reverseAnimation` on the descriptor signals that this clip should play
	// backward (e.g. Mystery collapse: explosion in reverse → back to ? box).
	const reverseAnimation = $derived(
		'reverseAnimation' in props.symbolInfo && props.symbolInfo.reverseAnimation === true,
	);

	// `animationEnd` on the descriptor limits the playback range (TrackEntry.animationEnd).
	// For the reverse collapse we set it to duration/2 so only the closing half plays.
	const animationEnd = $derived(
		'animationEnd' in props.symbolInfo ? (props.symbolInfo.animationEnd as number) : undefined,
	);
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
		reverse={reverseAnimation}
		animationEnd={animationEnd}
		listener={props.listener}
	/>
</SpineProvider>
