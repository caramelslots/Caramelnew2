/**
 * Phone VRAM: drop tir (gallery + Stage E) GPU after the cabinet slides out.
 * Extra FS does not need the 4K target_board atlas or cabinet sprites.
 * Reload before the next tir; Super curtains are never touched.
 */

import { Assets } from 'pixi.js';
import type { TextureAtlas } from '@esotericsoftware/spine-core';
import { SpineTexture } from '@esotericsoftware/spine-pixi-v8';
import { getProcessed } from '../../../../packages/pixi-svelte/src/lib/assetLoad';

import assets from './assets';
import { downscalePhoneSpineAtlases, isPhoneForAtlasDownscale } from './phoneSpineAtlasDownscale';
import { SHOT_BULLET_SPRITES } from './shotBulletAssets';
import { TARGET_BOARD_SPRITE_URLS } from './targetBoardAssets';

export const TIR_SPINE_KEYS = ['targetBoardFlip', 'shotBullet'] as const;
export type TirSpineKey = (typeof TIR_SPINE_KEYS)[number];

export const isPhoneTirGpuUnload = isPhoneForAtlasDownscale;

const TIR_SPRITE_URLS: readonly string[] = [
	...TARGET_BOARD_SPRITE_URLS,
	SHOT_BULLET_SPRITES.bullet,
];

const spineSrcUrls = (key: TirSpineKey): string[] => {
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

export const isTirPixiLive = (opts: {
	targetPickOpen: boolean;
	targetPickSlide: number;
	flipCount: number;
	hasShotFlight: boolean;
}) =>
	opts.targetPickOpen ||
	opts.targetPickSlide > 0.001 ||
	opts.flipCount > 0 ||
	opts.hasShotFlight;

const unloadTirSpineKey = (
	key: TirSpineKey,
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

export const unloadTirPixiGpu = (loadedAssets: Record<string, unknown>): Record<string, unknown> => {
	let next = loadedAssets;
	for (const key of TIR_SPINE_KEYS) {
		next = unloadTirSpineKey(key, next);
	}
	if (TIR_SPRITE_URLS.length > 0) {
		void Assets.unload([...TIR_SPRITE_URLS]).catch(() => {
			/* not in Pixi cache */
		});
	}
	return next;
};

export const ensureTirPixiLoaded = async (
	loadedAssets: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
	const patch: Record<string, unknown> = {};
	let changed = false;

	for (const key of TIR_SPINE_KEYS) {
		if (loadedAssets[key] || patch[key]) continue;
		const entry = assets[key];
		if (!entry || entry.type !== 'spine') continue;
		const loadSrc = spineSrcUrls(key);
		const rawAsset = await Assets.load(loadSrc);
		const processed = getProcessed({
			key,
			rawAsset,
			type: entry.type,
			src: entry.src,
		});
		if (!processed) continue;
		Object.assign(patch, processed);
		changed = true;
	}

	if (!changed) return null;
	downscalePhoneSpineAtlases();
	return patch;
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

export const ensureTirPixiInApp = async (stateApp: {
	loadedAssets?: Record<string, unknown>;
}) => {
	const loaded = stateApp.loadedAssets ?? {};
	const patch = await ensureTirPixiLoaded(loaded);
	if (!patch) return;
	stateApp.loadedAssets = { ...loaded, ...patch };
};
