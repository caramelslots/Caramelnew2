<!--
	Phone: unload tir GPU after the cabinet is gone (gallery dismiss / Stage E
	slide-out). Super curtains stay. Next tir reloads via ensureTirPixiLoaded.
-->
<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { devPreview } from '../game/devPreview.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		ensureTirPixiLoaded,
		isPhoneTirGpuUnload,
		isTirPixiLive,
		TIR_SPINE_KEYS,
		unloadTirPixiGpu,
		waitAnimationFrames,
	} from '../game/tirGpuMemory';

	const app = getContextApp();

	let syncGen = 0;
	let tirEverLive = false;

	const applyLoadedPatch = (patch: Record<string, unknown> | null) => {
		if (!patch) return;
		app.stateApp.loadedAssets = {
			...app.stateApp.loadedAssets,
			...patch,
		};
	};

	const liveNow = () =>
		isTirPixiLive({
			targetPickOpen: stateGame.targetPickOpen,
			targetPickSlide: stateGame.targetPickSlide,
			flipCount: stateGame.targetShotFlips.length,
			hasShotFlight: stateGame.targetShotFlight != null,
		});

	$effect(() => {
		if (!app.stateApp.loaded) return;

		const live = liveNow();
		const gen = ++syncGen;

		if (live) {
			tirEverLive = true;
			void (async () => {
				const patch = await ensureTirPixiLoaded(
					(app.stateApp.loadedAssets ?? {}) as Record<string, unknown>,
				);
				if (gen !== syncGen) return;
				applyLoadedPatch(patch);
			})();
			return;
		}

		if (!tirEverLive) return;
		if (!isPhoneTirGpuUnload()) return;
		if (devPreview.forceShowTargetBoard) return;

		void (async () => {
			await waitAnimationFrames(2);
			if (gen !== syncGen) return;
			if (liveNow()) return;
			if (devPreview.forceShowTargetBoard) return;
			const loaded = app.stateApp.loadedAssets as Record<string, unknown> | undefined;
			if (!loaded) return;
			if (!TIR_SPINE_KEYS.some((key) => key in loaded)) return;
			app.stateApp.loadedAssets = unloadTirPixiGpu(loaded);
		})();
	});
</script>
