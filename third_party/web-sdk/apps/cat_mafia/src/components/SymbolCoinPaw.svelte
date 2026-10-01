<script lang="ts">
	import { SpineProvider, SpineTrack } from 'pixi-svelte';
	import { stateBetDerived, stateModal } from 'state-shared';

	import CoinPawSkin from './CoinPawSkin.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import { stateGame } from '../game/stateGame.svelte';

	export type CoinPawSkinName = 'bronze' | 'silver' | 'gold';
	export type CoinPawClip = 'loop' | 'appear';

	type Props = {
		x?: number;
		y?: number;
		skin: CoinPawSkinName;
		clip: CoinPawClip;
		sizeRatio: number;
		offsetX?: number;
		inViewport?: boolean;
		/** Duel desk — freeze living idle only while this side holds the win spotlight. */
		duelSide?: DuelSide;
		oncomplete?: () => void;
	};

	const props: Props = $props();

	// Rest (`clip: 'loop'`) plays designer Spine `idle` while living idle is on —
	// same gate as H1–L4 / W. Land plays one-shot `appear_flash`, then settles
	// onto looping `idle`.
	let landed = $state(false);

	// A fresh land on the same cell (clip flips back to 'appear') must replay
	// the flip even if a previous appear already completed on this instance.
	$effect(() => {
		if (props.clip === 'appear') landed = false;
	});

	const playing = $derived(props.clip === 'appear' && !landed);
	const animationName = $derived(playing ? 'appear_flash' : 'idle');
	const spineX = $derived((props.x ?? 0) + (props.offsetX ?? 0));
	const autoUpdate = $derived.by(() => {
		if (playing) return true;
		if (props.inViewport === false) return false;
		if (stateModal.modal != null) return false;
		if (stateGame.transitionActive || stateGame.winOverlayActive) return false;
		if (!stateGame.livingIdleActive) return false;
		if (props.duelSide && stateDuel.winSpotlightSide === props.duelSide) return false;
		return true;
	});
</script>

<SpineProvider
	x={spineX}
	y={props.y}
	key="coinsPaw"
	width={SYMBOL_SIZE * props.sizeRatio}
	{autoUpdate}
>
	<CoinPawSkin skin={props.skin} />
	<SpineTrack
		trackIndex={0}
		{animationName}
		loop={!playing}
		timeScale={stateBetDerived.timeScale()}
		listener={{
			complete: () => {
				if (landed || props.clip !== 'appear') return;
				landed = true;
				props.oncomplete?.();
			},
		}}
	/>
</SpineProvider>
