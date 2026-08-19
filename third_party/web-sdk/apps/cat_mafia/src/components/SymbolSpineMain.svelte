<script lang="ts">
	import { SpineProvider, SpineTrack, type SpineTrackProps } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import { stateGame } from '../game/stateGame.svelte';
	import type { SymbolName } from '../game/types';

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

	// Namespaced rest poses (`*/idle`) are frozen. Designer `idle` loops on
	// every visible living symbol at once while the board is idle.
	const animationName = $derived(props.symbolInfo.animationName);
	const isLivingIdle = $derived(animationName === 'idle');
	const autoUpdate = $derived.by(() => {
		const name = animationName;
		if (!name) return true;
		if (name === 'idle') {
			if (props.inViewport === false) return false;
			return stateGame.livingIdleActive;
		}
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
	const offsetY = $derived(
		'offsetY' in props.symbolInfo && typeof props.symbolInfo.offsetY === 'number'
			? props.symbolInfo.offsetY
			: 0,
	);
</script>

<SpineProvider
	x={props.x}
	y={(props.y ?? 0) + offsetY}
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
