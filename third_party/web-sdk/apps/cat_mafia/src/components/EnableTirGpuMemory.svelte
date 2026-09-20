<!--
	Unload tir GPU after the cabinet is gone (gallery dismiss / Stage E
	slide-out). Super curtains stay. Next tir reloads via ensureTirPixiLoaded.
-->
<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { devPreview } from '../game/devPreview.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		ensureTirPixiLoaded,
		isTirPixiLive,
		TIR_SPINE_KEYS,
		unloadTirPixiGpuAsync,
		waitAnimationFrames,
	} from '../game/tirGpuMemory';

	const app = getContextApp();

	let syncGen = 0;

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
		const loaded = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
		const tirReady = TIR_SPINE_KEYS.every((key) => key in loaded);

		if (live) {
			if (tirReady) return;
			const mode = stateGame.targetPickSeatMode;
			void (async () => {
				const patch = await ensureTirPixiLoaded(
					(app.stateApp.loadedAssets ?? {}) as Record<string, unknown>,
					mode,
				);
				if (gen !== syncGen) return;
				applyLoadedPatch(patch);
			})();
			return;
		}

		if (devPreview.forceShowTargetBoard) return;

		void (async () => {
			await waitAnimationFrames(2);
			if (gen !== syncGen) return;
			if (liveNow()) return;
			if (devPreview.forceShowTargetBoard) return;
			const latest = app.stateApp.loadedAssets as Record<string, unknown> | undefined;
			if (!latest) return;
			if (!TIR_SPINE_KEYS.some((key) => key in latest)) return;
			app.stateApp.loadedAssets = await unloadTirPixiGpuAsync(latest);
		})();
	});
</script>
