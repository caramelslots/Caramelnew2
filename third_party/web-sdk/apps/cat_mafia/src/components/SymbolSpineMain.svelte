<script lang="ts">
	import { SpineProvider, SpineTrack, type SpineTrackProps } from 'pixi-svelte';

	import { getSymbolInfo } from '../game/utils';
	import { pickBonusIdleClip, SYMBOL_SIZE, type BonusIdleClip } from '../game/constants';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import { getAutoCellFitRatio } from '../game/symbolCellFit.svelte';
	import type { SymbolName } from '../game/types';
	import BonusUnclipFrame from './BonusUnclipFrame.svelte';

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
	// (`win` / `activation` / `activate` / W) await complete; postWinStatic
	// descriptors set `loop: true` so the hold keeps playing at 1×.
	const animationName = $derived(props.symbolInfo.animationName);
	const isLivingIdle = $derived(animationName === 'idle');
	/** Bonus rest after land / activate — looping idle + one-shot blink/ears. */
	const usesBonusIdleVariants = $derived(props.symbolName === 'B' && isLivingIdle);
	let bonusIdleClip = $state<BonusIdleClip>('idle');
	/** Bump so SpineTrack restarts when swapping flavour clips. */
	let bonusIdleNonce = $state(0);

	$effect(() => {
		// Reset flavour cycle whenever we (re)enter Bonus idle from another clip
		// (land → idle, activate → postWin idle).
		void props.symbolName;
		void animationName;
		bonusIdleClip = 'idle';
		bonusIdleNonce = 0;
	});

	const trackAnimationName = $derived(
		usesBonusIdleVariants ? bonusIdleClip : animationName,
	);

	/**
	 * Soft freeze only off-screen / under heavy overlays. Do not gate on
	 * `livingIdleActive` — that stays false through post-land settle and was
	 * killing the Bonus cycle after a short run.
	 */
	const bonusIdleAutoUpdate = $derived.by(() => {
		if (props.inViewport === false) return false;
		if (stateGame.transitionActive || stateGame.winOverlayActive) return false;
		if (props.duelSide) return stateDuel.winSpotlightSide !== props.duelSide;
		// Keep breathing during payline dim — Bonus is rare and should not stall.
		return true;
	});

	const autoUpdate = $derived.by(() => {
		const name = animationName;
		if (!name) return true;
		if (name === 'idle') {
			if (usesBonusIdleVariants) return bonusIdleAutoUpdate;
			if (props.inViewport === false) return false;
			if (!stateGame.livingIdleActive) return false;
			if (props.duelSide && stateDuel.winSpotlightSide === props.duelSide) return false;
			return true;
		}
		return !name.endsWith('/idle');
	});

	const loop = $derived.by(() => {
		// Base `idle` loops forever; blink/ears are one-shots that return to idle.
		// This way a missed `complete` can never leave Bonus frozen on a finished clip.
		if (usesBonusIdleVariants) return bonusIdleClip === 'idle';
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
	const offsetX = $derived(
		'offsetX' in props.symbolInfo && typeof props.symbolInfo.offsetX === 'number'
			? props.symbolInfo.offsetX
			: 0,
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

	const listener = $derived.by((): SpineTrackProps['listener'] => {
		const base = props.listener;
		if (!usesBonusIdleVariants) return base;
		return {
			...base,
			complete: (entry) => {
				base?.complete?.(entry);
				const name = entry.animation?.name;
				if (name === 'idle_blink' || name === 'idle_ears') {
					bonusIdleClip = 'idle';
					bonusIdleNonce += 1;
					return;
				}
				if (name !== 'idle') return;
				// Looping idle fires complete each cycle (~1.3s) — roll for flavour.
				const next = pickBonusIdleClip();
				if (next === 'idle') return;
				bonusIdleClip = next;
				bonusIdleNonce += 1;
			},
		};
	});
</script>

<SpineProvider
	x={(props.x ?? 0) + offsetX}
	y={(props.y ?? 0) + offsetY}
	key={props.symbolInfo.assetKey}
	height={fitHeight}
	{autoUpdate}
>
	{#if props.symbolName === 'B'}
		<BonusUnclipFrame />
	{/if}
	{#key `${trackAnimationName}:${bonusIdleNonce}`}
		<SpineTrack
			{loop}
			trackIndex={0}
			animationName={trackAnimationName}
			timeScale={SYMBOL_SPINE_TIME_SCALE}
			reverse={reverseAnimation}
			animationEnd={animationEnd}
			{listener}
		/>
	{/key}
</SpineProvider>
