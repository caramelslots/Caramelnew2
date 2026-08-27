<script lang="ts">
	import { SpineProvider, SpineTrack, type SpineTrackProps } from 'pixi-svelte';

	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
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
		/** Duel desk — freeze living idle only while this side holds the win spotlight. */
		duelSide?: DuelSide;
	};

	const props: Props = $props();

	/**
	 * Board symbol spines always play at 1× — idle and win share this.
	 * Turbo only shortens waits + reel scroll (see stateGame.timeScale override).
	 */
	const SYMBOL_SPINE_TIME_SCALE = 1;

	// Namespaced rest poses (`*/idle`) are frozen. One-shot celebrate clips
	// (`win` / `activation` / W/B) await complete; postWinStatic descriptors
	// set `loop: true` so the hold keeps playing at 1×.
	const animationName = $derived(props.symbolInfo.animationName);
	const isLivingIdle = $derived(animationName === 'idle');
	const autoUpdate = $derived.by(() => {
		const name = animationName;
		if (!name) return true;
		if (name === 'idle') {
			if (props.inViewport === false) return false;
			if (!stateGame.livingIdleActive) return false;
			// Duel: only the celebrating desk freezes; the other keeps breathing.
			if (props.duelSide && stateDuel.winSpotlightSide === props.duelSide) return false;
			return true;
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
