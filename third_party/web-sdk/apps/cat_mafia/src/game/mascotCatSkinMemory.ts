/**
 * Cat mascot skin key (gray base / white FS|duel).
 * Both atlases stay resident — phone one-skin unload was removed (blank mascot + no bullet fly).
 */

import { Assets } from 'pixi.js';
import { getProcessed } from '../../../../packages/pixi-svelte/src/lib/assetLoad';

import assets from './assets';
import type { GameType } from './types';

export const MASCOT_CAT_SPINE_WHITE = 'mascotCat' as const;
export const MASCOT_CAT_SPINE_GRAY = 'mascotCatGray' as const;

export type MascotCatSpineKey = typeof MASCOT_CAT_SPINE_WHITE | typeof MASCOT_CAT_SPINE_GRAY;

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
