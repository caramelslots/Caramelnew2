<!--
	Intro loader backdrop: sky + roofs on one canvas (no overlay box),
	plus a separate scrolling clouds strip.
	Baked at the same texel density as the Pixi street plate (1920 wide,
	Linear) so the still is not sharper/blockier than the animated street.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		LOADER_INTRO_CLOUDS_URL,
		LOADER_INTRO_ROOFS_URL,
		LOADER_INTRO_SKY_URL,
	} from '../game/earlyLoaderPreload';
	import {
		LOADER_INTRO_CLOUDS_SPEED_PX_S,
		LOADER_INTRO_CLOUDS_Y_FRAC,
		LOADER_INTRO_COLOR_MATCH,
		LOADER_INTRO_FADE_MS,
	} from '../game/constants';
	import {
		INTRO_CLOUDS_NATIVE,
		INTRO_NATIVE,
		INTRO_ROOFS_NATIVE,
		SPINE_PLATE_PX_W,
		getLoaderIntroLayerBox,
		getLoaderIntroRoofsBox,
	} from '../game/loaderIntroLayout';

	const context = getContext();

	let sceneCanvasEl = $state<HTMLCanvasElement>();
	let cloudsCanvasEl = $state<HTMLCanvasElement>();
	let ready = $state(false);
	let skyImg: HTMLImageElement | undefined;
	let cloudsImg: HTMLImageElement | undefined;
	let roofsImg: HTMLImageElement | undefined;
	let roofsScratch: HTMLCanvasElement | undefined;

	const canvasSize = $derived.by(() => {
		const layout = context.stateLayoutDerived.canvasSizes();
		return layout.width > 0 && layout.height > 0
			? layout
			: { width: window.innerWidth, height: window.innerHeight };
	});

	const box = $derived(getLoaderIntroLayerBox(canvasSize));
	const roofsBox = $derived(
		getLoaderIntroRoofsBox(canvasSize, context.stateLayoutDerived.canvasSizeType()),
	);
	const sceneBox = $derived.by(() => {
		const top = Math.min(box.top, roofsBox.top);
		const bottom = Math.max(box.top + box.height, roofsBox.top + roofsBox.height);
		return {
			left: box.left,
			top,
			width: box.width,
			height: Math.max(1, bottom - top),
		};
	});
	const fading = $derived(gameEntrance.introFading);

	const loadImage = (src: string) =>
		new Promise<HTMLImageElement>((resolve, reject) => {
			const img = new Image();
			img.decoding = 'async';
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error(src));
			img.src = src;
		});

	const getBakeSize = (nativeHeight = INTRO_NATIVE.height) => {
		const texW = SPINE_PLATE_PX_W;
		const bakeH = Math.round(nativeHeight * (SPINE_PLATE_PX_W / INTRO_NATIVE.width));
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

	const mapBoxToBake = (
		source: { top: number; height: number },
		texW: number,
		bakeH: number,
	) => {
		const y = ((source.top - sceneBox.top) / sceneBox.height) * bakeH;
		const h = (source.height / sceneBox.height) * bakeH;
		return { x: 0, y, w: texW, h };
	};

	const sanitizeRoofAlpha = (ctx: CanvasRenderingContext2D, texW: number, bakeH: number) => {
		const data = ctx.getImageData(0, 0, texW, bakeH);
		const px = data.data;
		for (let i = 0; i < px.length; i += 4) {
			if (px[i + 3] >= 16) continue;
			px[i] = 0;
			px[i + 1] = 0;
			px[i + 2] = 0;
			px[i + 3] = 0;
		}
		for (let x = 0; x < texW; x++) {
			let solidY = -1;
			for (let y = 0; y < bakeH; y++) {
				if (px[(y * texW + x) * 4 + 3] >= 200) {
					solidY = y;
					break;
				}
			}
			if (solidY <= 0) continue;
			for (let y = 0; y < solidY; y++) {
				const i = (y * texW + x) * 4;
				px[i] = 0;
				px[i + 1] = 0;
				px[i + 2] = 0;
				px[i + 3] = 0;
			}
		}
		ctx.putImageData(data, 0, 0);
	};

	const paintRoofsLayer = (texW: number, bakeH: number) => {
		if (!roofsImg?.complete) return;
		if (!roofsScratch) roofsScratch = document.createElement('canvas');
		ensureCanvasSize(roofsScratch, texW, bakeH);
		const ctx = roofsScratch.getContext('2d', { colorSpace: 'srgb', alpha: true });
		if (!ctx) return;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, texW, bakeH);
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(roofsImg, 0, 0, texW, bakeH);
		sanitizeRoofAlpha(ctx, texW, bakeH);
	};

	const paintScene = () => {
		const canvas = sceneCanvasEl;
		if (!canvas || !skyImg?.complete || sceneBox.width <= 0) return;

		const texW = SPINE_PLATE_PX_W;
		const bakeH = Math.max(1, Math.round((sceneBox.height / sceneBox.width) * texW));
		ensureCanvasSize(canvas, texW, bakeH);

		const ctx = canvas.getContext('2d', { colorSpace: 'srgb', alpha: true });
		if (!ctx) return;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, texW, bakeH);
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';

		const skyRect = mapBoxToBake(box, texW, bakeH);
		ctx.drawImage(skyImg, skyRect.x, skyRect.y, skyRect.w, skyRect.h);

		if (roofsImg?.complete) {
			const { texW: roofW, bakeH: roofH } = getBakeSize(INTRO_ROOFS_NATIVE.height);
			paintRoofsLayer(roofW, roofH);
			if (roofsScratch) {
				const roofRect = mapBoxToBake(roofsBox, texW, bakeH);
				ctx.drawImage(roofsScratch, roofRect.x, roofRect.y, roofRect.w, roofRect.h);
			}
		}
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
		paintScene();
		if (skyImg?.complete && roofsImg?.complete && cloudsImg?.complete) {
			ready = true;
		}
	};

	$effect(() => {
		void sceneCanvasEl;
		void cloudsCanvasEl;
		void box;
		void roofsBox;
		void sceneBox;
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

<div
	class="intro-bg"
	class:ready
	class:fading
	style:--color-match={LOADER_INTRO_COLOR_MATCH}
	style:--fade-ms="{LOADER_INTRO_FADE_MS}ms"
>
	<canvas
		bind:this={sceneCanvasEl}
		class="layer"
		width="1"
		height="1"
		style:left="{Math.round(sceneBox.left)}px"
		style:top="{Math.round(sceneBox.top)}px"
		style:width="{Math.round(sceneBox.width)}px"
		style:height="{Math.round(sceneBox.height)}px"
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
</div>

<style lang="scss">
	.intro-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: visible;
		background: transparent;
		pointer-events: none;
		opacity: 1;
		filter: var(--color-match);
		transition: opacity var(--fade-ms, 800ms) cubic-bezier(0.65, 0, 0.35, 1);
	}

	.intro-bg.fading {
		opacity: 0;
	}

	.layer {
		position: absolute;
		display: block;
		opacity: 0;
		transition: opacity 400ms ease;
		pointer-events: none;
		user-select: none;
		image-rendering: auto;
	}

	.intro-bg.ready .layer {
		opacity: 1;
	}
</style>
