<script lang="ts">
	import {
		coinPawSkinForTier,
		subscribeCoinPawSpine,
		type CoinPawSpineMode,
	} from '../game/coinHtmlSpine';
	import { COIN_PAW_SOURCE_SIZE } from '../game/coinSpriteSheet';

	type Props = {
		tier: number;
		speed?: number;
		mode?: CoinPawSpineMode;
	};

	const props: Props = $props();
	const skin = $derived(coinPawSkinForTier(props.tier));
	const speed = $derived(Math.max(0.25, props.speed ?? 1));
	const mode = $derived(props.mode ?? 'row');

	let canvas = $state<HTMLCanvasElement | undefined>();
	let speedNow = speed;
	$effect(() => {
		speedNow = speed;
	});

	$effect(() => {
		const el = canvas;
		const skinName = skin;
		const playMode = mode;
		if (!el) return;
		return subscribeCoinPawSpine({
			canvas: el,
			skin: skinName,
			mode: playMode,
			getSpeed: () => speedNow,
		});
	});
</script>

<canvas
	class="coin-paw-sprite"
	bind:this={canvas}
	width={COIN_PAW_SOURCE_SIZE}
	height={COIN_PAW_SOURCE_SIZE}
	aria-hidden="true"
></canvas>

<style lang="scss">
	.coin-paw-sprite {
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
</style>
