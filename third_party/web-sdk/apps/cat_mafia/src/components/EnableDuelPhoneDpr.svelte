<script lang="ts">
	import { devicePixelRatio, innerHeight, innerWidth } from 'svelte/reactivity/window';
	import { getContextApp } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		cappedRendererResolution,
		duelPhonePortraitMaxDpr,
		GAME_MAX_RESOLUTION,
		phonePortraitMaxDpr,
	} from '../game/duelPhoneDpr';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { isPhoneCanvasSizeType } from '../game/streetOffscreenCull';

	const context = getContext();
	const pixiContext = getContextApp();

	const isPhonePortrait = $derived(
		context.stateLayoutDerived.layoutType() === 'portrait' &&
			isPhoneCanvasSizeType(context.stateLayoutDerived.canvasSizeType()),
	);

	const duelVisualActive = $derived(stateDuel.active || stateDuel.phase === 'outro');

	$effect(() => {
		const app = pixiContext.stateApp.pixiApplication;
		if (!app?.renderer) return;

		// Track DPR + viewport so we re-apply after resize / zoom changes.
		const dpr = devicePixelRatio.current ?? 1;
		void innerWidth.current;
		void innerHeight.current;

		const maxDpr =
			isPhonePortrait && duelVisualActive
				? duelPhonePortraitMaxDpr()
				: isPhonePortrait
					? phonePortraitMaxDpr()
					: GAME_MAX_RESOLUTION;

		const resolution = cappedRendererResolution(dpr, maxDpr);
		if (Math.abs(app.renderer.resolution - resolution) < 0.001) return;

		app.renderer.resolution = resolution;
		app.resize?.();
	});
</script>
