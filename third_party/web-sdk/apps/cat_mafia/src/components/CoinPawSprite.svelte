<script lang="ts">
	import { onDestroy } from 'svelte';

	import {
		COIN_PAW_APPEAR_FPS,
		COIN_PAW_SOURCE_SIZE,
		coinPawSkinForTier,
		drawCoinPawFrame,
		loadCoinPawSheet,
		type CoinPawSheet,
	} from '../game/coinSpriteSheet';

	type Props = {
		tier: number;
		speed?: number;
	};

	const props: Props = $props();
	const skin = $derived(coinPawSkinForTier(props.tier));
	const speed = $derived(Math.max(0.25, props.speed ?? 1));

	let canvas = $state<HTMLCanvasElement | undefined>();
	let raf = 0;

	const fitCanvas = (el: HTMLCanvasElement) => {
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const cssW = Math.max(1, el.clientWidth);
		const cssH = Math.max(1, el.clientHeight);
		const w = Math.round(cssW * dpr);
		const h = Math.round(cssH * dpr);
		if (el.width !== w) el.width = w;
		if (el.height !== h) el.height = h;
		return { w, h };
	};

	$effect(() => {
		const el = canvas;
		const skinName = skin;
		const playback = speed;
		if (!el) return;

		let cancelled = false;
		let sheet: CoinPawSheet | undefined;
		let mode: 'appear' | 'hold' = 'appear';
		let index = 0;
		let acc = 0;
		let last = performance.now();

		const frameNames = (current: 'appear' | 'hold') => {
			if (!sheet) return [];
			if (current === 'hold') {
				// Last appear frame is the designer reverse (x1 / x2 / x3).
				const appear = sheet.animations[`${skinName}_appear`] ?? [];
				return appear.slice(-1);
			}
			return sheet.animations[`${skinName}_appear`] ?? [];
		};

		const paint = () => {
			const names = frameNames(mode);
			const frameName = names[index] ?? names[0];
			if (!frameName || !sheet) return;
			const { w, h } = fitCanvas(el);
			const ctx = el.getContext('2d');
			if (!ctx) return;
			drawCoinPawFrame(ctx, sheet, frameName, w, h);
		};

		const tick = (now: number) => {
			if (cancelled) return;
			const dt = (now - last) * playback;
			last = now;
			if (mode === 'hold') {
				paint();
				raf = requestAnimationFrame(tick);
				return;
			}
			acc += dt;
			const step = 1000 / COIN_PAW_APPEAR_FPS;
			const names = frameNames('appear');
			while (acc >= step && names.length > 0) {
				acc -= step;
				index += 1;
				if (index >= names.length) {
					mode = 'hold';
					index = 0;
					break;
				}
			}
			paint();
			raf = requestAnimationFrame(tick);
		};

		void loadCoinPawSheet().then((loaded) => {
			if (cancelled) return;
			sheet = loaded;
			last = performance.now();
			paint();
			raf = requestAnimationFrame(tick);
		});

		return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
		};
	});

	onDestroy(() => cancelAnimationFrame(raf));
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
