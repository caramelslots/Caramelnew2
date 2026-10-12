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
	import { isBuyBonusFlowOpen } from '../game/isAnyMenuOpen';
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

		void innerWidth.current;
		void innerHeight.current;
		void devicePixelRatio.current;
		void isPhonePortrait;
		void duelVisualActive;
		void isBuyBonusFlowOpen();

		const apply = () => {
			const dpr = devicePixelRatio.current ?? 1;
			const zoom = window.visualViewport?.scale ?? 1;
			// Pinch-zoom inflates devicePixelRatio on some WebKits — keep layout DPR only.
			const layoutDpr = dpr / Math.max(1, zoom);
			const maxDpr =
				isPhonePortrait && isBuyBonusFlowOpen()
					? 1
					: isPhonePortrait && duelVisualActive
						? duelPhonePortraitMaxDpr()
						: isPhonePortrait
							? phonePortraitMaxDpr()
							: GAME_MAX_RESOLUTION;
			const resolution = cappedRendererResolution(layoutDpr, maxDpr);
			if (Math.abs(app.renderer.resolution - resolution) < 0.001) return;
			app.renderer.resolution = resolution;
			app.resize?.();
		};

		apply();
		const vv = window.visualViewport;
		vv?.addEventListener('resize', apply);
		vv?.addEventListener('scroll', apply);
		return () => {
			vv?.removeEventListener('resize', apply);
			vv?.removeEventListener('scroll', apply);
		};
	});
</script>
