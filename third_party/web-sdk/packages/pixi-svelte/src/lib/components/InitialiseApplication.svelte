<script lang="ts">
	import * as PIXI from 'pixi.js';
	import { onMount, onDestroy, type Snippet } from 'svelte';
	import { devicePixelRatio } from 'svelte/reactivity/window';

	import { getContextApp } from '../context.svelte';
	import { preloadFont } from '../utils.svelte';

	type Props = {
		children: Snippet;
		// Optional upper bound on the renderer resolution (device pixel ratio).
		// Capping at e.g. 2 avoids rendering 3×+ pixels on high-DPR phones/Retina,
		// which is a major fill-rate cost. Undefined = no cap (previous behavior).
		maxResolution?: number;
		antialias?: boolean;
		/** On phone portrait: cap resolution at 2.5 and disable MSAA. */
		tuneForMobilePortrait?: boolean;
		/**
		 * Prefer WebGL on iOS/Android (including iPadOS masquerading as Mac).
		 * Pixi 8 defaults to WebGPU, which is a common mobile context-loss crash.
		 * Desktop keeps WebGPU. Ignored when `preference` is set.
		 */
		webglOnIosAndroid?: boolean;
		preference?: 'webgl' | 'webgpu';
	};

	const props: Props = $props();
	const context = getContextApp();

	let wrap: HTMLDivElement;
	let initialised = $state(false);

	const resolveGpuPreference = (): 'webgl' | 'webgpu' => {
		if (props.preference) return props.preference;
		if (!props.webglOnIosAndroid || typeof navigator === 'undefined') return 'webgpu';
		const ua = navigator.userAgent;
		const isIOS =
			/iP(hone|ad|od)/.test(ua) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
		const isAndroid = /Android/i.test(ua);
		return isIOS || isAndroid ? 'webgl' : 'webgpu';
	};

	const initialiseApplication = async () => {
		PIXI.Assets.reset();

		await preloadFont();
		const dpr = devicePixelRatio.current ?? 1;
		const isPhonePortrait =
			typeof window !== 'undefined' &&
			window.innerWidth <= 480 &&
			window.innerHeight > window.innerWidth;
		const mobileTuned = props.tuneForMobilePortrait && isPhonePortrait;
		const maxRes =
			mobileTuned && props.maxResolution ? Math.min(props.maxResolution, 2.5) : props.maxResolution;
		const resolution = maxRes ? Math.min(dpr, maxRes) : dpr;
		const antialias = props.antialias ?? !mobileTuned;
		context.stateApp.pixiApplication = new PIXI.Application<PIXI.Renderer<HTMLCanvasElement>>();
		await context.stateApp.pixiApplication.init({
			autoDensity: true,
			backgroundAlpha: 0,
			hello: true,
			multiView: false,
			antialias,
			clearBeforeRender: true,
			preference: resolveGpuPreference(),
			powerPreference: 'high-performance',
			resolution,
			resizeTo: window,
		});

		wrap.appendChild(context.stateApp.pixiApplication.canvas);

		// to prevent that you can't scroll the page with touch on the canvas. https://github.com/pixijs/pixijs/issues/4824
		context.stateApp.pixiApplication.renderer.events.autoPreventDefault = false;
		context.stateApp.pixiApplication.renderer.canvas.style.touchAction = 'auto';
	};

	onMount(async () => {
		try {
			if (!initialised) await initialiseApplication();
			initialised = true;
		} catch (error) {
			console.error(error);
		}
	});

	onDestroy(() => {
		if (context.stateApp.pixiApplication) {
			context.stateApp.pixiApplication.destroy();
		}
	});
</script>

<div bind:this={wrap}>
	{#if initialised}
		{@render props.children()}
	{/if}
</div>
