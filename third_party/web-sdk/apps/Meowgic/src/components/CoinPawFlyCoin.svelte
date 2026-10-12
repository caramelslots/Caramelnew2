<!--
	Paying paw-coin: play appear_flash once, then freeze on its last frame
	(reverse face with x1 / x2 / x3). Do NOT swap to main_coin_slow — that
	clip clears the multiplier slots. Matches HTML CoinPawSprite row mode.
-->
<script lang="ts">
	import { SpineProvider, SpineTrack } from 'pixi-svelte';

	import CoinPawFlySkin from './CoinPawFlySkin.svelte';

	type Props = {
		skin: 'bronze' | 'silver' | 'gold';
		size: number;
		timeScale: number;
	};

	const props: Props = $props();
	let landed = $state(false);
	const playing = $derived(!landed);
	// Stay on appear_flash forever — freeze at the end frame when landed.
	const animationName = 'appear_flash';
	const autoUpdate = $derived(playing);
</script>

<SpineProvider key="coinsPaw" width={props.size} {autoUpdate}>
	<CoinPawFlySkin skin={props.skin} />
	<SpineTrack
		trackIndex={0}
		{animationName}
		loop={false}
		timeScale={props.timeScale}
		listener={{
			complete: () => {
				if (!landed) landed = true;
			},
		}}
	/>
</SpineProvider>
