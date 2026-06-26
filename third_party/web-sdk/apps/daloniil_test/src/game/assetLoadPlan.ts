import type { Asset, Assets } from 'pixi-svelte';

import assets from './assets';
import { LOADER_SCREEN_IMAGE_URLS } from './loaderCardAssets';

/**
 * Loaded after `stateApp.loaded` (Press to continue) in the background.
 * Safe to defer: not needed for the loading screen, first board render, or transition.
 */
export const DEFERRED_ASSET_KEYS = new Set<string>([
	'anticipation',
	'bigwin',
	'fsPopup',
	'reelhouse',
	'WWin',
	'BWin',
	'fsCongBoard',
	'fsCongNumber',
	'fsLeftCounter',
	'coins',
	'babloFont',
	'krutoiFont',
	'krutoiFontRu',
	'prostoiFont',
	'prostoiFontRu',
	'prostoiFontHi',
	'prostoiFontVi',
	'prostoiFontCjk',
	'betPlus',
	'betMinus',
	'autoplayButton',
	'autoplayMobileButton',
	'spin1',
	'spin2',
	'menuButton',
	'infoButton',
	'turbo1',
	'turbo2',
	'turbo3',
]);

export const isDeferredAssetKey = (key: string) => DEFERRED_ASSET_KEYS.has(key);

export const collectAssetHttpUrls = (asset: Asset): string[] => {
	if (typeof asset.src === 'string') return [asset.src];
	return Object.values(asset.src).filter((value): value is string => typeof value === 'string');
};

/** HTTP URLs for the critical path (preload + play-ready bundle, excluding deferred). */
export const collectCriticalAssetHttpUrls = (assetMap: Assets = assets): string[] => {
	const urls = new Set<string>();

	for (const [key, asset] of Object.entries(assetMap)) {
		if (isDeferredAssetKey(key)) continue;
		for (const url of collectAssetHttpUrls(asset)) urls.add(url);
	}

	return [...urls];
};

/** Warm-cache list: critical game assets + loader card PNGs. */
export const collectEarlyPreloadUrls = (): string[] => {
	const urls = new Set(collectCriticalAssetHttpUrls());
	for (const url of LOADER_SCREEN_IMAGE_URLS) urls.add(url);
	return [...urls];
};

export const partitionAssetKeys = (assetMap: Assets = assets) => {
	const preloadKeys: string[] = [];
	const criticalKeys: string[] = [];
	const deferredKeys: string[] = [];

	for (const key of Object.keys(assetMap)) {
		const asset = assetMap[key];
		if (asset.preload) {
			preloadKeys.push(key);
		} else if (isDeferredAssetKey(key)) {
			deferredKeys.push(key);
		} else {
			criticalKeys.push(key);
		}
	}

	return { preloadKeys, criticalKeys, deferredKeys };
};
