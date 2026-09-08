<!--
	Intro loader backdrop: sky + scrolling clouds + house roofs.
	Baked at the same texel density as the Pixi street plate (1920 wide,
	Linear) so the still is not sharper/blockier than the animated street.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { getContext } from '../game/context';
	import {
		LOADER_INTRO_CLOUDS_URL,
		LOADER_INTRO_ROOFS_URL,
		LOADER_INTRO_SKY_URL,
	} from '../game/earlyLoaderPreload';
	import {
		LOADER_INTRO_CLOUDS_SPEED_PX_S,
		LOADER_INTRO_CLOUDS_Y_FRAC,
		LOADER_INTRO_COLOR_MATCH,
	} from '../game/constants';
	import {
		INTRO_CLOUDS_NATIVE,
		INTRO_NATIVE,
		SPINE_PLATE_PX_W,
		getLoaderIntroLayerBox,
	} from '../game/loaderIntroLayout';

	const context = getContext();

	let skyCanvasEl = $state<HTMLCanvasElement>();
	let cloudsCanvasEl = $state<HTMLCanvasElement>();
	let roofsCanvasEl = $state<HTMLCanvasElement>();
	let ready = $state(false);
	let skyImg: HTMLImageElement | undefined;
	let cloudsImg: HTMLImageElement | undefined;
	let roofsImg: HTMLImageElement | undefined;

	const canvasSize = $derived.by(() => {
		const layout = context.stateLayoutDerived.canvasSizes();
		return layout.width > 0 && layout.height > 0
			? layout
			: { width: window.innerWidth, height: window.innerHeight };
	});

	const box = $derived(getLoaderIntroLayerBox(canvasSize));

	const loadImage = (src: string) =>
		new Promise<HTMLImageElement>((resolve, reject) => {
			const img = new Image();
			img.decoding = 'async';
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error(src));
			img.src = src;
		});

	const getBakeSize = () => {
		const texW = SPINE_PLATE_PX_W;
		const bakeH = Math.round(INTRO_NATIVE.height * (SPINE_PLATE_PX_W / INTRO_NATIVE.width));
		return { texW, bakeH };
	};

	const ensureCanvasSize = (canvas: HTMLCanvasElement, texW: number, bakeH: number) => {
		if (canvas.width !== texW) canvas.width = texW;
		if (canvas.height !== bakeH) canvas.height = bakeH;
	};

	const getCloudDrawRect = (texW: number, bakeH: number) => {
		const scale = texW / INTRO_NATIVE.width;
		const drawW = INTRO_CLOUDS_NATIVE.width * scale;
		const drawH = INTRO_CLOUDS_NATIVE.height * scale;
		const y = bakeH * LOADER_INTRO_CLOUDS_Y_FRAC;
		return { drawW, drawH, y };
	};

	const paintSky = () => {
		const canvas = skyCanvasEl;
		if (!canvas || !skyImg?.complete) return;

		const { texW, bakeH } = getBakeSize();
		ensureCanvasSize(canvas, texW, bakeH);

		const ctx = canvas.getContext('2d', { colorSpace: 'srgb', alpha: true });
		if (!ctx) return;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, texW, bakeH);
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'low';
		ctx.drawImage(skyImg, 0, 0, texW, bakeH);
	};

	const paintRoofs = () => {
		const canvas = roofsCanvasEl;
		if (!canvas || !roofsImg?.complete) return;

		const { texW, bakeH } = getBakeSize();
		ensureCanvasSize(canvas, texW, bakeH);

		const ctx = canvas.getContext('2d', { colorSpace: 'srgb', alpha: true });
		if (!ctx) return;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, texW, bakeH);
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'low';
		ctx.drawImage(roofsImg, 0, 0, texW, bakeH);
	};

	const paintClouds = (offsetPx: number) => {
		const canvas = cloudsCanvasEl;
		if (!canvas || !cloudsImg?.complete) return;

		const { texW, bakeH } = getBakeSize();
		ensureCanvasSize(canvas, texW, bakeH);

		const ctx = canvas.getContext('2d', { colorSpace: 'srgb', alpha: true });
		if (!ctx) return;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, texW, bakeH);
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'low';

		const { drawW, drawH, y } = getCloudDrawRect(texW, bakeH);
		if (drawW <= 0) return;

		const tileStep = drawW;
		const startX = -tileStep + (offsetPx % tileStep);
		for (let x = startX; x < texW + tileStep; x += tileStep) {
			ctx.drawImage(cloudsImg, x, y, drawW, drawH);
		}
	};

	const paintStatic = () => {
		paintSky();
		paintRoofs();
		if (skyImg?.complete && roofsImg?.complete && cloudsImg?.complete) {
			ready = true;
		}
	};

	$effect(() => {
		void skyCanvasEl;
		void cloudsCanvasEl;
		void roofsCanvasEl;
		paintStatic();
	});

	onMount(() => {
		let cancelled = false;
		let rafId = 0;
		let startMs = 0;

		const tick = (nowMs: number) => {
			if (cancelled) return;
			if (!startMs) startMs = nowMs;
			const elapsedS = (nowMs - startMs) / 1000;
			const scale = SPINE_PLATE_PX_W / INTRO_NATIVE.width;
			const offsetPx = elapsedS * LOADER_INTRO_CLOUDS_SPEED_PX_S * scale;
			paintClouds(offsetPx);
			rafId = requestAnimationFrame(tick);
		};

		void Promise.all([
			loadImage(LOADER_INTRO_SKY_URL),
			loadImage(LOADER_INTRO_CLOUDS_URL),
			loadImage(LOADER_INTRO_ROOFS_URL),
		])
			.then(([sky, clouds, roofs]) => {
				if (cancelled) return;
				skyImg = sky;
				cloudsImg = clouds;
				roofsImg = roofs;
				paintStatic();
				paintClouds(0);
				rafId = requestAnimationFrame(tick);
			})
			.catch(() => {
				/* preload in app.html retries on next load */
			});

		return () => {
			cancelled = true;
			cancelAnimationFrame(rafId);
		};
	});
</script>

<div class="intro-bg" class:ready style:--color-match={LOADER_INTRO_COLOR_MATCH}>
	<canvas
		bind:this={skyCanvasEl}
		class="layer"
		width="1"
		height="1"
		style:left="{Math.round(box.left)}px"
		style:top="{Math.round(box.top)}px"
		style:width="{Math.round(box.width)}px"
		style:height="{Math.round(box.height)}px"
	></canvas>
	<canvas
		bind:this={cloudsCanvasEl}
		class="layer"
		width="1"
		height="1"
		style:left="{Math.round(box.left)}px"
		style:top="{Math.round(box.top)}px"
		style:width="{Math.round(box.width)}px"
		style:height="{Math.round(box.height)}px"
	></canvas>
	<canvas
		bind:this={roofsCanvasEl}
		class="layer"
		width="1"
		height="1"
		style:left="{Math.round(box.left)}px"
		style:top="{Math.round(box.top)}px"
		style:width="{Math.round(box.width)}px"
		style:height="{Math.round(box.height)}px"
	></canvas>
</div>

<style lang="scss">
	.intro-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		background: transparent;
		pointer-events: none;
	}

	.layer {
		position: absolute;
		display: block;
		opacity: 0;
		transition: opacity 400ms ease;
		pointer-events: none;
		user-select: none;
		image-rendering: auto;
		filter: var(--color-match);
	}

	.intro-bg.ready .layer {
		opacity: 1;
	}
</style>
