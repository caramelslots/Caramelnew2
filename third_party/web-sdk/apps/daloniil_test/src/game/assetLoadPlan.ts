import type { Asset, Assets } from 'pixi-svelte';

import assets from './assets';
import { LOADER_SCREEN_IMAGE_URLS } from './loaderCardAssets';

/** Stake GIF screen — day backgrounds, audio manifest, transition, press font, high symbols. */
export const LOADER_BATCH_1_KEYS = [
	'mainBackground',
	'lanternDay',
	'boardDay',
	'sound',
	'transition',
	'prostoiWhiteFont',
	'H1',
	'H2',
	'H3',
	'H4',
	'H1Img',
	'H2Img',
	'H3Img',
	'H4Img',
] as const satisfies readonly (keyof typeof assets)[];

/** Bootstrap splash — night theme, low/wild/bonus/mystery symbols, core game fonts. */
export const LOADER_BATCH_2_KEYS = [
	'featureBackground',
	'lanternNight',
	'boardNight',
	'L1',
	'L2',
	'L3',
	'L4',
	'W',
	'B',
	'M',
	'L1Img',
	'L2Img',
	'L3Img',
	'L4Img',
	'BImg',
	'WImg',
	'MImg',
	'MBgImg',
	'prostoiFont',
	'prostoiFontRu',
	'prostoiWhiteFontRu',
	'krutoiFont',
	'krutoiFontRu',
	'babloFont',
] as const satisfies readonly (keyof typeof assets)[];

/** Cards screen — bonus bar, win variants, CJK fonts, bigwin/fs, coins, HUD sprites. */
export const LOADER_BATCH_3_KEYS = [
	'bonusBarV',
	'bonusBarH',
	'bonusBarCat',
	'WWin',
	'BWin',
	'anticipation',
	'prostoiFontHi',
	'prostoiFontVi',
	'prostoiFontCjk',
	'prostoiWhiteFontHi',
	'prostoiWhiteFontVi',
	'prostoiWhiteFontCjk',
	'bigwin',
	'fsPopup',
	'reelhouse',
	'fsCongBoard',
	'fsCongNumber',
	'fsLeftCounter',
	'coins',
	'betPlus',
	'betMinus',
	'autoplayButton',
	'autoplayMobileButton',
	'spin1',
	'menuButton',
	'infoButton',
	'turbo1',
	'turbo2',
	'turbo3',
] as const satisfies readonly (keyof typeof assets)[];

export const LOADER_ASSET_BATCHES = [
	LOADER_BATCH_1_KEYS,
	LOADER_BATCH_2_KEYS,
	LOADER_BATCH_3_KEYS,
] as const;

export const LOADER_ASSET_KEY_COUNT = LOADER_ASSET_BATCHES.reduce(
	(sum, batch) => sum + batch.length,
	0,
);

if (LOADER_ASSET_KEY_COUNT !== Object.keys(assets).length) {
	throw new Error(
		`assetLoadPlan: expected ${Object.keys(assets).length} keys, got ${LOADER_ASSET_KEY_COUNT}`,
	);
}

export const collectAssetHttpUrls = (asset: Asset): string[] => {
	if (typeof asset.src === 'string') return [asset.src];
	return Object.values(asset.src).filter((value): value is string => typeof value === 'string');
};

export const collectBatchHttpUrls = (
	batchKeys: readonly string[],
	assetMap: Assets = assets,
): string[] => {
	const urls = new Set<string>();

	for (const key of batchKeys) {
		const asset = assetMap[key];
		if (!asset) continue;
		for (const url of collectAssetHttpUrls(asset)) urls.add(url);
	}

	return [...urls];
};

/** HTTP warm-up during the Stake GIF (before Pixi / auth may be ready). */
export const collectBatch1EarlyPreloadUrls = (): string[] => {
	const urls = new Set(collectBatchHttpUrls(LOADER_BATCH_1_KEYS));
	for (const url of LOADER_SCREEN_IMAGE_URLS) urls.add(url);
	return [...urls];
};

/** HTTP warm-up during Bootstrap (parallel with batch 2 Pixi load). */
export const collectBatch2EarlyPreloadUrls = (): string[] =>
	collectBatchHttpUrls(LOADER_BATCH_2_KEYS);
