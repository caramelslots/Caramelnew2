<!--
	One paying paw-coin spine: appear_flash once, then freeze on the tier face
	(same as HTML CoinPawSprite row mode). Parent owns fly transforms.
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
	const animationName = $derived(playing ? 'appear_flash' : 'main_coin_slow');
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
				if (playing) landed = true;
			},
		}}
	/>
</SpineProvider>
