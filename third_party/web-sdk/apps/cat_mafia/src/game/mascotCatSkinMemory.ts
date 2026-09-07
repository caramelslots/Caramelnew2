/**
 * Phone VRAM: keep only one cat mascot atlas in GPU (gray base / white FS|duel).
 * Desktop keeps both for snappy theme swaps.
 */

import { Assets } from 'pixi.js';
import type { TextureAtlas } from '@esotericsoftware/spine-core';
import { SpineTexture } from '@esotericsoftware/spine-pixi-v8';
import { getProcessed } from '../../../../packages/pixi-svelte/src/lib/assetLoad';

import assets from './assets';
import { isPhoneForAtlasDownscale } from './phoneSpineAtlasDownscale';
import type { GameType } from './types';

export const MASCOT_CAT_SPINE_WHITE = 'mascotCat' as const;
export const MASCOT_CAT_SPINE_GRAY = 'mascotCatGray' as const;

export type MascotCatSpineKey = typeof MASCOT_CAT_SPINE_WHITE | typeof MASCOT_CAT_SPINE_GRAY;

export const isPhoneMascotCatSkinUnload = isPhoneForAtlasDownscale;

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

export const otherMascotCatSpineKey = (key: MascotCatSpineKey): MascotCatSpineKey =>
	key === MASCOT_CAT_SPINE_WHITE ? MASCOT_CAT_SPINE_GRAY : MASCOT_CAT_SPINE_WHITE;

const spineSrcUrls = (key: MascotCatSpineKey): string[] => {
	const entry = assets[key];
	if (!entry || entry.type !== 'spine') return [];
	return Object.values(entry.src).filter((v): v is string => typeof v === 'string');
};

const destroyAtlasGpuTextures = (atlasUrl: string) => {
	let atlas: TextureAtlas | undefined;
	try {
		atlas = Assets.get(atlasUrl) as TextureAtlas | undefined;
	} catch {
		return;
	}
	if (!atlas?.pages?.length) return;
	for (const page of atlas.pages) {
		const pixiTex = (page.texture as SpineTexture | null)?.texture;
		if (!pixiTex) continue;
		try {
			pixiTex.destroy(true);
		} catch {
			/* already released */
		}
	}
};

/** Drop SkeletonData + GPU pages for one cat skin. Safe only when unused by Spine. */
export const unloadMascotCatSpineKey = (
	key: MascotCatSpineKey,
	loadedAssets: Record<string, unknown>,
): Record<string, unknown> => {
	if (!(key in loadedAssets)) return loadedAssets;

	const urls = spineSrcUrls(key);
	const atlasUrl = (assets[key] as { src?: { atlas?: string } })?.src?.atlas;
	if (atlasUrl) destroyAtlasGpuTextures(atlasUrl);

	if (urls.length > 0) {
		void Assets.unload(urls).catch(() => {
			/* cache miss after destroy */
		});
	}

	const next = { ...loadedAssets };
	delete next[key];
	return next;
};

/** Ensure skin is in loadedAssets (reload after phone unload). Returns patch or null. */
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

export const waitAnimationFrames = (n = 2) =>
	new Promise<void>((resolve) => {
		let left = Math.max(1, n);
		const tick = () => {
			left -= 1;
			if (left <= 0) {
				resolve();
				return;
			}
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});
