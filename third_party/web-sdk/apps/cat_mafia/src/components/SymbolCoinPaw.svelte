<script lang="ts">
	import { SpineProvider, SpineTrack } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import CoinPawSkin from './CoinPawSkin.svelte';
	import { SYMBOL_SIZE } from '../game/constants';

	export type CoinPawSkinName = 'bronze' | 'silver' | 'gold';
	export type CoinPawClip = 'loop' | 'appear';

	type Props = {
		x?: number;
		y?: number;
		skin: CoinPawSkinName;
		clip: CoinPawClip;
		sizeRatio: number;
		oncomplete?: () => void;
	};

	const props: Props = $props();

	// The coin must NOT spin constantly on the board: rest states freeze on the
	// first frame of `main_coin_slow` (autoUpdate=false → posed once, zero
	// ticker cost), and only `land` plays the one-shot `appear_flash` flip
	// (pop-in + flash, same clip as the overlay coins) at full 60fps, then
	// settles back to the frozen rest face.
	let landed = $state(false);

	// A fresh land on the same cell (clip flips back to 'appear') must replay
	// the flip even if a previous appear already completed on this instance.
	$effect(() => {
		if (props.clip === 'appear') landed = false;
	});

	const playing = $derived(props.clip === 'appear' && !landed);
	const animationName = $derived(playing ? 'appear_flash' : 'main_coin_slow');
	const autoUpdate = $derived(playing);
</script>

<SpineProvider
	x={props.x}
	y={props.y}
	key="coinsPaw"
	width={SYMBOL_SIZE * props.sizeRatio}
	{autoUpdate}
>
	<CoinPawSkin skin={props.skin} />
	<SpineTrack
		trackIndex={0}
		{animationName}
		loop={false}
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
