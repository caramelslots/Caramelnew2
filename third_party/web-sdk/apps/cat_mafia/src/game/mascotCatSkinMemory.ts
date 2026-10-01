/**
 * Cat mascot skin key (gray base / white FS|duel).
 * Keep only the live atlas in GPU — the other is dropped after the spine remounts.
 */

import { Assets } from 'pixi.js';
import { getProcessed } from '../../../../packages/pixi-svelte/src/lib/assetLoad';

import assets from './assets';
import { isPhoneForAtlasDownscale } from './phoneSpineAtlasDownscale';
import type { GameType } from './types';

export const MASCOT_CAT_SPINE_WHITE = 'mascotCat' as const;
export const MASCOT_CAT_SPINE_GRAY = 'mascotCatGray' as const;

export type MascotCatSpineKey = typeof MASCOT_CAT_SPINE_WHITE | typeof MASCOT_CAT_SPINE_GRAY;

export const otherMascotCatSpineKey = (key: MascotCatSpineKey): MascotCatSpineKey =>
	key === MASCOT_CAT_SPINE_WHITE ? MASCOT_CAT_SPINE_GRAY : MASCOT_CAT_SPINE_WHITE;

export const wantedMascotCatSpineKey = (opts: {
	gameType: GameType | string;
	duelActive: boolean;
	/** Upcoming theme while steam covers the board. */
	transitionGameType?: GameType | string | null;
}): MascotCatSpineKey => {
	const gt = opts.transitionGameType ?? opts.gameType;
	if (gt === 'freegame' || opts.duelActive) return MASCOT_CAT_SPINE_WHITE;
	return MASCOT_CAT_SPINE_GRAY;
};

const spineSrcUrls = (key: MascotCatSpineKey): string[] => {
	const entry = assets[key];
	if (!entry || entry.type !== 'spine') return [];
	return Object.values(entry.src).filter((v): v is string => typeof v === 'string');
};

/** Ensure skin is in loadedAssets. Returns patch or null. */
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
	// Never destroy(true). Desktop: park only — Assets.unload still races batch
	// BindGroups (idle bounce / mascot loop → `_resourceId` freeze). Phone: unload.
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
