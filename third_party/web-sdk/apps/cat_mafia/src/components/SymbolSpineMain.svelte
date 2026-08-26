<script lang="ts">
	import { SpineProvider, SpineTrack, type SpineTrackProps } from 'pixi-svelte';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import { stateGame } from '../game/stateGame.svelte';
	import { getAutoCellFitRatio } from '../game/symbolCellFit.svelte';
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

	/**
	 * Board symbol spines always play at 1× — idle and win share this.
	 * Turbo only shortens waits + reel scroll (see stateGame.timeScale override).
	 */
	const SYMBOL_SPINE_TIME_SCALE = 1;

	// Namespaced rest poses (`*/idle`) are frozen. Living clips — designer
	// `idle`, `win` / `activation`, and W/B celebrate tracks — loop at the
	// same 1× pace. Idle additionally waits for livingIdleActive.
	const animationName = $derived(props.symbolInfo.animationName);
	const isLivingLoop = $derived(
		animationName === 'idle' ||
			animationName === 'win' ||
			animationName === 'activation' ||
			animationName === 'Special_2/win' ||
			animationName === 'Special_1/wave',
	);
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
		return isLivingLoop;
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
	/** Runtime silhouette fit overrides static sizeRatios when available. */
	const fitHeight = $derived.by(() => {
		const auto = getAutoCellFitRatio(props.symbolInfo.assetKey);
		const ratio = auto ?? props.symbolInfo.sizeRatios.height;
		return SYMBOL_SIZE * ratio;
	});
</script>

<SpineProvider
	x={props.x}
	y={(props.y ?? 0) + offsetY}
	key={props.symbolInfo.assetKey}
	height={fitHeight}
	{autoUpdate}
>
	<SpineTrack
		{loop}
		trackIndex={0}
		animationName={animationName}
		timeScale={SYMBOL_SPINE_TIME_SCALE}
		reverse={reverseAnimation}
		animationEnd={animationEnd}
		listener={props.listener}
	/>
</SpineProvider>
