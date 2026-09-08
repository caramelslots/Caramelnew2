<!--
	Buy-bonus card Spine via a Pixi Application owned by this card.
	Stays mounted after first init so open / buy / back do not reload textures.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { Spine } from '@esotericsoftware/spine-pixi-v8';

	import {
		BUY_BONUS_HIDDEN_SLOTS,
		BUY_BONUS_SPINE_ANIM,
		buyBonusSpineUrls,
		getBuyBonusPixiTransform,
		type BuyBonusSpineVariant,
	} from '../game/buyBonusHtmlSpine';
	import { isHtmlWebglPaused } from '../game/htmlWebglPause';

	type Props = {
		variant: BuyBonusSpineVariant;
		active?: boolean;
	};

	const { variant, active = true }: Props = $props();

	let host = $state<HTMLDivElement>();
	let ready = $state(false);
	let appRef: PIXI.Application | undefined;
	let spineRef: Spine | undefined;

	const hostDpr = () => Math.min(window.devicePixelRatio || 1, 2);

	const hostBox = (el: HTMLElement) => ({
		w: Math.max(0, Math.round(el.clientWidth)),
		h: Math.max(0, Math.round(el.clientHeight)),
	});

	const waitForHostSize = (el: HTMLElement, signal: { cancelled: boolean }) =>
		new Promise<boolean>((resolve) => {
			const sized = () => {
				const { w, h } = hostBox(el);
				return w > 2 && h > 2;
			};
			if (sized()) {
				resolve(true);
				return;
			}
			const observer = new ResizeObserver(() => {
				if (signal.cancelled) {
					observer.disconnect();
					resolve(false);
					return;
				}
				if (sized()) {
					observer.disconnect();
					resolve(true);
				}
			});
			observer.observe(el);
		});

	const applyLayout = (app: PIXI.Application, spine: Spine, el: HTMLDivElement) => {
		const { w, h } = hostBox(el);
		if (w < 2 || h < 2) return;
		const dpr = hostDpr();
		if (app.renderer.resolution !== dpr) app.renderer.resolution = dpr;
		app.renderer.resize(w, h);
		const canvas = app.canvas;
		const bw = Math.round(w * dpr);
		const bh = Math.round(h * dpr);
		if (canvas.width !== bw || canvas.height !== bh) {
			canvas.width = bw;
			canvas.height = bh;
			app.renderer.resize(w, h);
		}
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		const transform = getBuyBonusPixiTransform(variant, w, h);
		spine.scale.set(transform.scale);
		spine.x = w * 0.5 + transform.spineX;
		spine.y = h * 0.5 + transform.spineY;
	};

	const hideReferenceSlots = (spine: Spine) => {
		for (const name of BUY_BONUS_HIDDEN_SLOTS[variant]) {
			const slot = spine.skeleton.findSlot(name);
			if (!slot) continue;
			slot.setAttachment(null);
		}
	};

	const present = () => {
		const app = appRef;
		const spine = spineRef;
		const el = host;
		if (!app || !spine || !el) return;
		applyLayout(app, spine, el);
		app.render();
	};

	onMount(() => {
		const signal = { cancelled: false };
		let app: PIXI.Application | undefined;
		let spine: Spine | undefined;
		let observer: ResizeObserver | undefined;

		const setup = async () => {
			const el = host;
			if (!el) return;
			try {
				const sized = await waitForHostSize(el, signal);
				if (!sized || signal.cancelled || host !== el) return;

				const { w, h } = hostBox(el);
				app = new PIXI.Application();
				await app.init({
					width: w,
					height: h,
					backgroundAlpha: 0,
					antialias: true,
					autoDensity: true,
					preference: 'webgl',
					powerPreference: 'high-performance',
					resolution: hostDpr(),
				});
				if (signal.cancelled || host !== el) {
					app.destroy(true);
					return;
				}

				app.canvas.style.display = 'block';
				app.canvas.style.position = 'absolute';
				app.canvas.style.inset = '0';
				app.canvas.style.width = '100%';
				app.canvas.style.height = '100%';
				app.canvas.style.pointerEvents = 'none';
				el.appendChild(app.canvas);
				appRef = app;

				const urls = buyBonusSpineUrls(variant);
				await PIXI.Assets.load([urls.atlas, urls.skeleton]);
				if (signal.cancelled || host !== el) return;

				spine = Spine.from({
					skeleton: urls.skeleton,
					atlas: urls.atlas,
					autoUpdate: true,
				});
				spine.state.setAnimation(0, BUY_BONUS_SPINE_ANIM[variant], true);
				spine.update(0);
				hideReferenceSlots(spine);
				app.stage.addChild(spine);
				spineRef = spine;
				applyLayout(app, spine, el);
				app.render();
				ready = true;

				observer = new ResizeObserver(() => {
					if (app && spine && host) applyLayout(app, spine, host);
				});
				observer.observe(el);
				if (el.parentElement) observer.observe(el.parentElement);
			} catch (error) {
				console.error(`[BuyBonusCardSpine] ${variant} failed`, error);
			}
		};

		void setup();

		return () => {
			signal.cancelled = true;
			ready = false;
			observer?.disconnect();
			observer = undefined;
			if (app) {
				app.destroy(true);
				app = undefined;
			}
			appRef = undefined;
			spineRef = undefined;
			spine = undefined;
		};
	});

	$effect(() => {
		if (!ready || !appRef) return;
		const playing = active && !isHtmlWebglPaused();
		appRef.ticker.speed = playing ? 1 : 0;
		if (playing) present();
	});
</script>

<div class="buy-bonus-card-spine" class:ready bind:this={host} aria-hidden="true"></div>

<style lang="scss">
	.buy-bonus-card-spine {
		position: absolute;
		inset: 0;
		z-index: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		pointer-events: none;
		opacity: 0;

		&.ready {
			opacity: 1;
		}
	}
</style>
