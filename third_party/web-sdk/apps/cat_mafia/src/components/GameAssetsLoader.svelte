<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as PIXI from 'pixi.js';

	import { getContextApp } from 'pixi-svelte';
	import { getProcessed } from '../../../../packages/pixi-svelte/src/lib/assetLoad';
	import type { LoadedAssets, RawAsset } from 'pixi-svelte';
	import { waitForTimeout } from 'utils-shared/wait';

	import {
		BATCH4_HTML_ONLY_KEYS,
		LOADER_ASSET_BATCHES,
		getBatch3KeysForLocale,
		getEntryLoadKeyCount,
	} from '../game/assetLoadPlan';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { waitForLoaderStage } from '../game/loaderAssetPipeline.svelte';
	import { downscalePhoneSpineAtlases } from '../game/phoneSpineAtlasDownscale';
	import { ensureTargetBoardSpritesInPixi } from '../game/targetBoardAssets';
	import { omitParkedTirAssets, parkTirGpuForDeferredLoad, shouldSkipDeferredTirMerge } from '../game/tirGpuMemory';
	import { BATCH4_DEFERRED_KEYS } from '../game/featureGpuMemory';
	import { stateUrlDerived } from 'state-shared';

	type Props = { children: Snippet };

	const props: Props = $props();
	const context = getContextApp();

	let preLoaded = $state(false);
	let batch4Started = false;

	let loadedCount = 0;
	let entryTotal = 1;
	/** Pixi 1–3 fill 0–86%; buy-bonus takes the bar to 96% before Continue. */
	const PIXI_PROGRESS_CAP = 86;
	const ENTRY_PROGRESS_CAP = 96;
	/**
	 * After lift: brief settle, then batch 4.
	 * Buy-bonus WebGL waits for the first menu open.
	 */
	const POST_LIFT_BATCH4_MS = 50;

	const bumpProgress = () => {
		loadedCount += 1;
		if (context.stateApp.loaded) return;
		context.stateApp.loadingProgress = Math.min(
			PIXI_PROGRESS_CAP,
			(loadedCount / entryTotal) * PIXI_PROGRESS_CAP,
		);
	};

	const loadAssetBatch = async (nameList: readonly string[]) => {
		const loadedAssetsArray = await Promise.all(
			nameList.map(async (key) => {
				try {
					const { type, src } = context.stateApp.assets![key];
					const loadSrc =
						type === 'spine' ? Object.values(src).filter((item) => typeof item === 'string') : src;
					const rawAsset = await PIXI.Assets.load<RawAsset>(loadSrc);
					const processed = getProcessed({ key, rawAsset, type, src });
					bumpProgress();
					return processed;
				} catch (error) {
					console.error(error);
					bumpProgress();
				}
			}),
		);

		return loadedAssetsArray.reduce(
			(acc, cur) => ({
				...acc,
				...cur,
			}),
			{} as LoadedAssets,
		);
	};

	const mergeLoadedAssets = (loaded: LoadedAssets) => {
		if (Object.keys(loaded).length === 0) return;
		context.stateApp.loadedAssets = {
			...context.stateApp.loadedAssets,
			...loaded,
		};
	};

	$effect(() => {
		if (!preLoaded) {
			(async () => {
				loadedCount = 0;
				context.stateApp.loadingProgress = 0;

				const [batch1, batch2] = LOADER_ASSET_BATCHES;

				// Batch 3 is filtered to the active locale — locale-specific font keys
				// for other scripts (hi / vi / cjk) are skipped, saving 0.8–3 MB for
				// most users. LOADER_ASSET_KEY_COUNT still includes all locale font keys
				// so the progress bar slightly undershoots 100% before we force it below.
				const locale = stateUrlDerived.lang();
				const batch3 = getBatch3KeysForLocale(locale);
				entryTotal = getEntryLoadKeyCount(locale);

				const batch1Assets = await loadAssetBatch(batch1);
				mergeLoadedAssets(batch1Assets);
				preLoaded = true;

				await waitForLoaderStage('bootstrap');
				const batch2Assets = await loadAssetBatch(batch2);
				mergeLoadedAssets(batch2Assets);

				await waitForLoaderStage('cards');
				const batch3Assets = await loadAssetBatch(batch3);
				mergeLoadedAssets(batch3Assets);

				context.stateApp.loadingProgress = ENTRY_PROGRESS_CAP;

				context.stateApp.loaded = true;
			})();
		}
	});

	// After lift settles: batch 4. Buy-bonus GPU waits for the first menu open.
	$effect(() => {
		if (!context.stateApp.loaded || !gameEntrance.liftComplete || batch4Started) return;
		batch4Started = true;
		const [, , , batch4] = LOADER_ASSET_BATCHES;
		const deferred = new Set<string>([...BATCH4_DEFERRED_KEYS, ...BATCH4_HTML_ONLY_KEYS]);
		const batch4Now = batch4.filter((key) => !deferred.has(key));
		// One-shot: do not abort on effect re-run — Continue peak must stay clear.
		void (async () => {
			parkTirGpuForDeferredLoad();
			await waitForTimeout(POST_LIFT_BATCH4_MS);
			const batch4Assets = await loadAssetBatch(batch4Now);
			mergeLoadedAssets(
				shouldSkipDeferredTirMerge() ? omitParkedTirAssets(batch4Assets) : batch4Assets,
			);
			downscalePhoneSpineAtlases();
			gameEntrance.postLiftAssetsReady = true;
			if (!shouldSkipDeferredTirMerge()) void ensureTargetBoardSpritesInPixi('six');
		})();
	});
</script>

{#if preLoaded}
	{@render props.children()}
{/if}
