<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as PIXI from 'pixi.js';

	import { getContextApp } from 'pixi-svelte';
	import { getProcessed } from '../../../../packages/pixi-svelte/src/lib/assetLoad';
	import type { LoadedAssets, RawAsset } from 'pixi-svelte';

	import {
		LOADER_ASSET_BATCHES,
		getBatch3KeysForLocale,
		getEntryLoadKeyCount,
	} from '../game/assetLoadPlan';
	import { waitForLoaderStage } from '../game/loaderAssetPipeline.svelte';
	import { downscalePhoneSpineAtlases } from '../game/phoneSpineAtlasDownscale';
	import { startBuyBonusFlowPreload } from '../game/uiHtmlAssetManifest';
	import { stateUrlDerived } from 'state-shared';

	type Props = { children: Snippet };

	const props: Props = $props();
	const context = getContextApp();

	let preLoaded = $state(false);

	let loadedCount = 0;
	let entryTotal = 1;
	/** Pixi 1–3 fill 0–86%; buy-bonus takes the bar to 96% before Continue. */
	const PIXI_PROGRESS_CAP = 86;
	const ENTRY_PROGRESS_CAP = 96;

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

				const [batch1, batch2, , batch4] = LOADER_ASSET_BATCHES;

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
				await startBuyBonusFlowPreload();

				context.stateApp.loaded = true;

				// Batch 4 is bonus / duel / FS / tir — after buy-bonus, not blocking Continue.
				void loadAssetBatch(batch4).then((batch4Assets) => {
					mergeLoadedAssets(batch4Assets);
					// Batch 4 may include tir atlases loaded after initial phone downscale.
					downscalePhoneSpineAtlases();
				});
			})();
		}
	});
</script>

{#if preLoaded}
	{@render props.children()}
{/if}
