import type { Asset, Assets } from 'pixi-svelte';

import assets from './assets';
import { isCjkLocale } from './constants';
import { LOADER_SCREEN_IMAGE_URLS } from './loaderCardAssets';

/** Stake GIF screen — animated day/night spine, audio manifest, transition, press font, high symbols. */
export const LOADER_BATCH_1_KEYS = [
	'mainBackground',
	'boardDayBase',
	'boardContour',
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

/** Bootstrap splash — low/wild/bonus/mystery symbols, core game fonts. */
export const LOADER_BATCH_2_KEYS = [
	'L1',
	'L2',
	'L3',
	'L4',
	'W',
	'B',
	'BT',
	'M',
	'L1Img',
	'L2Img',
	'L3Img',
	'L4Img',
	'BImg',
	'BTImg',
	'WImg',
	'prostoiFont',
	'prostoiFontRu',
	'prostoiWhiteFontRu',
	'krutoiFont',
	'krutoiFontRu',
	'babloFont',
] as const satisfies readonly (keyof typeof assets)[];

/**
 * All six locale-specific font keys. Always declared in batch 3 so the
 * key-count check (loaded batches === Object.keys(assets).length)
 * passes. Only the subset matching the active locale is actually loaded by
 * GameAssetsLoader — the rest are intentionally skipped.
 */
export const LOCALE_FONT_KEYS = [
	'prostoiFontHi',
	'prostoiWhiteFontHi',
	'prostoiFontVi',
	'prostoiWhiteFontVi',
	'prostoiFontCjk',
	'prostoiWhiteFontCjk',
] as const satisfies readonly (keyof typeof assets)[];

/**
 * Returns only the locale-specific font keys needed for the given locale.
 * All other locales (en, ru, ar, …) use the base prostoi/krutoi atlases
 * already in batch 1 & 2 and need no extra files here.
 */
export const getLocaleSpecificFontKeys = (locale: string): readonly (keyof typeof assets)[] => {
	if (locale === 'hi') return ['prostoiFontHi', 'prostoiWhiteFontHi'];
	if (locale === 'vi') return ['prostoiFontVi', 'prostoiWhiteFontVi'];
	if (isCjkLocale(locale)) return ['prostoiFontCjk', 'prostoiWhiteFontCjk'];
	return [];
};

/**
 * Cards screen — win variants, cat-slow outline, locale fonts
 * (all declared for count check), coins, HUD sprites. Must finish before
 * "Press to continue".
 */
export const LOADER_BATCH_3_KEYS = [
	'WWin',
	'BWin',
	'outlineReel',
	...LOCALE_FONT_KEYS,
	'coins',
	'coinsPaw',
	'mascotCat',
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

/**
 * Post-entry deferred batch — heavy Spine animations only needed for bonus
 * events (big win, free-spin intro/outro). These assets are never rendered
 * until after the cloud transition completes, so they load in the background
 * while the player reads "Press to continue".
 */
export const LOADER_BATCH_4_KEYS = [
	'bigwin',
	'fsPopup',
	'fsCongBoard',
	'fsCongNumber',
	'fsLeftCounter',
] as const satisfies readonly (keyof typeof assets)[];

export const LOADER_ASSET_BATCHES = [
	LOADER_BATCH_1_KEYS,
	LOADER_BATCH_2_KEYS,
	LOADER_BATCH_3_KEYS,
	LOADER_BATCH_4_KEYS,
] as const;

export const LOADER_ASSET_KEY_COUNT = LOADER_ASSET_BATCHES.reduce(
	(sum, batch) => sum + batch.length,
	0,
);

if (LOADER_ASSET_KEY_COUNT !== Object.keys(assets).length) {
	throw new Error(
		`assetLoadPlan: expected ${Object.keys(assets).length} keys, got ${LOADER_ASSET_KEY_COUNT} loaded`,
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

/**
 * Returns batch-3 keys filtered to the active locale — skips the 4 locale
 * font keys that don't apply (saves 0.8–3 MB of Pixi loads for most users).
 */
export const getBatch3KeysForLocale = (locale: string): readonly string[] => {
	const activeFontKeys = new Set(getLocaleSpecificFontKeys(locale));
	const localeFontSet = new Set<string>(LOCALE_FONT_KEYS);
	return LOADER_BATCH_3_KEYS.filter(
		(key) => !localeFontSet.has(key) || activeFontKeys.has(key),
	);
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
