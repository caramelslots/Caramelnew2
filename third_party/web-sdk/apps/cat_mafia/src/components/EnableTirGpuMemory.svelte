<!--
	Unload tir GPU after the cabinet is gone (gallery dismiss / Stage E
	slide-out). Super curtains stay. Next tir reloads via ensureTirPixiLoaded
	(Assets.unload on all platforms — not park-only).
-->
<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { devPreview } from '../game/devPreview.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import {
		ensureTirPixiLoaded,
		isTirPixiLive,
		TIR_SPINE_KEYS,
		TIR_UNLOAD_DELAY_FRAMES,
		unloadTirPixiGpuAsync,
		waitAnimationFrames,
	} from '../game/tirGpuMemory';
	import assets from '../game/assets';
	import { spineAssetsPossiblyCached } from '../game/spineAtlasEvict';

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
			const loadedNow = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
			const needsEvict =
				TIR_SPINE_KEYS.some((key) => key in loadedNow) ||
				TIR_SPINE_KEYS.some((key) => {
					const entry = assets[key];
					if (!entry || entry.type !== 'spine') return false;
					const atlasUrl = entry.src?.atlas;
					const skeletonUrl = entry.src?.skeleton;
					return (
						typeof atlasUrl === 'string' &&
						spineAssetsPossiblyCached(
							atlasUrl,
							typeof skeletonUrl === 'string' ? skeletonUrl : undefined,
						)
					);
				});
			if (!needsEvict) return;

			await waitAnimationFrames(TIR_UNLOAD_DELAY_FRAMES);
			if (gen !== syncGen) return;
			if (liveNow()) return;
			if (devPreview.forceShowTargetBoard) return;
			const latest = (app.stateApp.loadedAssets ?? {}) as Record<string, unknown>;
			// Always run eviction when Cache still holds page `.webp`.
			app.stateApp.loadedAssets = await unloadTirPixiGpuAsync(latest);
		})();
	});
</script>
