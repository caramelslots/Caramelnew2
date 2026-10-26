/**
 * Single wizard cat spine (`mascotCat`). White/gray skins are gone.
 */

import { Assets } from 'pixi.js';
import { getProcessed } from '../../../../packages/pixi-svelte/src/lib/assetLoad';

import assets from './assets';
import { isPhoneForAtlasDownscale } from './phoneSpineAtlasDownscale';

export const MASCOT_CAT_SPINE_WHITE = 'mascotCat' as const;
/** @deprecated Same spine as `MASCOT_CAT_SPINE_WHITE`. Kept so older call sites compile. */
export const MASCOT_CAT_SPINE_GRAY = MASCOT_CAT_SPINE_WHITE;

export type MascotCatSpineKey = typeof MASCOT_CAT_SPINE_WHITE;

export const wantedMascotCatSpineKey = (_opts?: {
	gameType?: string;
	duelActive?: boolean;
	transitionGameType?: string | null;
}): MascotCatSpineKey => MASCOT_CAT_SPINE_WHITE;

const spineSrcUrls = (key: MascotCatSpineKey): string[] => {
	const entry = assets[key];
	if (!entry || entry.type !== 'spine') return [];
	return Object.values(entry.src).filter((v): v is string => typeof v === 'string');
};

/** Ensure the cat spine is in loadedAssets. Returns patch or null. */
export const ensureMascotCatSpineLoaded = async (
	key: MascotCatSpineKey,
	loadedAssets: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
	if (loadedAssets[key]) return null;

	const entry = assets[key];
	if (!entry || entry.type !== 'spine') return null;

	const loadSrc = spineSrcUrls(key);
	const rawAsset = await Assets.load(loadSrc);
	const processed = getProcessed({
		key,
		rawAsset,
		type: entry.type,
		src: entry.src,
	});
	if (!processed) return null;
	return processed as Record<string, unknown>;
};

export const unloadMascotCatSpine = (
	key: MascotCatSpineKey,
	loadedAssets: Record<string, unknown>,
): Record<string, unknown> => {
	if (!(key in loadedAssets)) return loadedAssets;
	if (isPhoneForAtlasDownscale()) {
		const urls = spineSrcUrls(key);
		if (urls.length > 0) {
			void Assets.unload(urls).catch(() => undefined);
		}
	}
	const next = { ...loadedAssets };
	delete next[key];
	return next;
};
