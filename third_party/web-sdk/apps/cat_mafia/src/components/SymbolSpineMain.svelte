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

	// Namespaced rest poses (`High_1/idle`, `Special_1/idle`, `Mystery/idle`) are
	// zero-movement frames — apply once, then freeze (autoUpdate=false) so every
	// resting cell doesn't burn ticker. Flat designer `idle` (letters / telephone /
	// lighter) is a living loop (breath, dial, flame) and must keep updating.
	const animationName = $derived(props.symbolInfo.animationName);
	const isLivingIdle = $derived(animationName === 'idle');
	const autoUpdate = $derived.by(() => {
		const name = animationName;
		if (!name) return true;
		if (name === 'idle') return true;
		return !name.endsWith('/idle');
	});
	const loop = $derived.by(() => {
		if (props.loop !== undefined) return props.loop;
		if ('loop' in props.symbolInfo && typeof props.symbolInfo.loop === 'boolean') {
			return props.symbolInfo.loop;
		}
		return isLivingIdle;
	});

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
		{loop}
		trackIndex={0}
		animationName={animationName}
		timeScale={stateBetDerived.timeScale()}
		reverse={reverseAnimation}
		animationEnd={animationEnd}
		listener={props.listener}
	/>
</SpineProvider>
