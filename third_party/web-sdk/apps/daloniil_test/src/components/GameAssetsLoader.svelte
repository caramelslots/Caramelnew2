<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as PIXI from 'pixi.js';

	import { getContextApp } from 'pixi-svelte';
	import { getProcessed } from '../../../../packages/pixi-svelte/src/lib/assetLoad';
	import type { LoadedAssets, RawAsset } from 'pixi-svelte';

	import { partitionAssetKeys } from '../game/assetLoadPlan';

	type Props = { children: Snippet };

	const props: Props = $props();
	const context = getContextApp();

	let preLoaded = $state(false);

	const { preloadKeys, criticalKeys, deferredKeys } = partitionAssetKeys(context.stateApp.assets);

	let criticalDone = 0;
	let criticalTotal = 0;

	const bumpProgress = () => {
		if (criticalTotal <= 0) {
			context.stateApp.loadingProgress = 100;
			return;
		}
		context.stateApp.loadingProgress = Math.min(100, (criticalDone / criticalTotal) * 100);
	};

	const loadAssetBatch = async (nameList: string[], trackProgress: boolean) => {
		const loadedAssetsArray = await Promise.all(
			nameList.map(async (key) => {
				try {
					const { type, src } = context.stateApp.assets![key];
					const loadSrc =
						type === 'spine' ? Object.values(src).filter((item) => typeof item === 'string') : src;
					const rawAsset = await PIXI.Assets.load<RawAsset>(loadSrc);
					const processed = getProcessed({ key, rawAsset, type, src });
					if (trackProgress) {
						criticalDone += 1;
						bumpProgress();
					}
					return processed;
				} catch (error) {
					console.error(error);
					if (trackProgress) {
						criticalDone += 1;
						bumpProgress();
					}
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

	const loadDeferredAssets = async () => {
		if (deferredKeys.length === 0) return;

		const loadedAssetsArray = await Promise.all(
			deferredKeys.map(async (key) => {
				try {
					const { type, src } = context.stateApp.assets![key];
					const loadSrc =
						type === 'spine' ? Object.values(src).filter((item) => typeof item === 'string') : src;
					const rawAsset = await PIXI.Assets.load<RawAsset>(loadSrc);
					return getProcessed({ key, rawAsset, type, src });
				} catch (error) {
					console.error(error);
				}
			}),
		);

		const merged = loadedAssetsArray.reduce(
			(acc, cur) => ({
				...acc,
				...cur,
			}),
			{} as LoadedAssets,
		);

		if (Object.keys(merged).length > 0) {
			context.stateApp.loadedAssets = {
				...context.stateApp.loadedAssets,
				...merged,
			};
		}
	};

	$effect(() => {
		if (!preLoaded) {
			(async () => {
				criticalTotal = preloadKeys.length + criticalKeys.length;
				criticalDone = 0;
				context.stateApp.loadingProgress = 0;

				if (preloadKeys.length > 0) {
					const preLoadedAssets = await loadAssetBatch(preloadKeys, true);
					if (preLoadedAssets) {
						context.stateApp.loadedAssets = {
							...context.stateApp.loadedAssets,
							...preLoadedAssets,
						};
					}
				}

				preLoaded = true;

				if (criticalKeys.length > 0) {
					const criticalLoadedAssets = await loadAssetBatch(criticalKeys, true);
					if (criticalLoadedAssets) {
						context.stateApp.loadedAssets = {
							...context.stateApp.loadedAssets,
							...criticalLoadedAssets,
						};
					}
				}

				context.stateApp.loadingProgress = 100;
				context.stateApp.loaded = true;

				void loadDeferredAssets();
			})();
		}
	});
</script>

{#if preLoaded}
	{@render props.children()}
{/if}
