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
import {
	downscalePhoneSpineAtlases,
	isPhoneForAtlasDownscale,
	PHONE_SPINE_ATLAS_MAX_EDGE,
	prepareCappedAtlasImageSources,
} from './phoneSpineAtlasDownscale';
import { devPreview } from './devPreview.svelte';
import { eventEmitter } from './eventEmitter';
import { SHOT_BULLET_SPRITES } from './shotBulletAssets';
import { stateApp } from './stateApp';
import { stateGame } from './stateGame.svelte';
import { TARGET_BOARD_SPRITE_URLS } from './targetBoardAssets';

export const TIR_SPINE_KEYS = ['targetBoardFlip', 'shotBullet'] as const;
export type TirSpineKey = (typeof TIR_SPINE_KEYS)[number];

export const isPhoneTirGpuUnload = isPhoneForAtlasDownscale;

/** Stage E rapid taps — cap concurrent flip spines on phone. */
export const PHONE_MAX_PARALLEL_TIR_FLIPS = 2;

/** True after a phone/desktop unload until the next ensureTir load. */
let tirGpuParked = false;

/** Batch 4 must not put tir back into GPU after gallery/Stage E unload. */
export const shouldSkipDeferredTirMerge = () => tirGpuParked;

/** Phone entry: skip tir in batch 4 — load capped on first gallery / Stage E. */
export const parkTirGpuForDeferredLoad = () => {
	tirGpuParked = true;
};

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
	tirGpuParked = true;
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
	const phone = isPhoneForAtlasDownscale();

	for (const key of TIR_SPINE_KEYS) {
		if (loadedAssets[key] || patch[key]) continue;
		const entry = assets[key];
		if (!entry || entry.type !== 'spine') continue;
		const loadSrc = spineSrcUrls(key);
		const atlasUrl = (entry.src as { atlas?: string })?.atlas;
		const skeletonUrl = (entry.src as { skeleton?: string })?.skeleton;
		let rawAsset: unknown;
		if (phone && atlasUrl && skeletonUrl) {
			const images = await prepareCappedAtlasImageSources(atlasUrl, PHONE_SPINE_ATLAS_MAX_EDGE);
			rawAsset = images
				? await Assets.load([{ src: atlasUrl, data: { images } }, skeletonUrl])
				: await Assets.load(loadSrc);
		} else {
			rawAsset = await Assets.load(loadSrc);
		}
		const processed = getProcessed({
			key,
			rawAsset: rawAsset as Parameters<typeof getProcessed>[0]['rawAsset'],
			type: entry.type,
			src: entry.src,
		});
		if (!processed) continue;
		Object.assign(patch, processed);
		changed = true;
	}

	if (!changed) return null;
	tirGpuParked = false;
	// No-op when pages were already capped; fallback 4K load still shrinks here.
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

/**
 * Awaitable TIR GPU drop after the cabinet is off-screen.
 * Phone: destroy atlas textures + Assets.unload. Desktop: UI already gone; skip unload.
 */
export const unloadTirPixiGpuAsync = async (
	loadedAssets: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
	tirGpuParked = true;
	let next = loadedAssets;
	const jobs: Promise<unknown>[] = [];

	for (const key of TIR_SPINE_KEYS) {
		if (!(key in next)) continue;
		const urls = spineSrcUrls(key);
		const atlasUrl = (assets[key] as { src?: { atlas?: string } })?.src?.atlas;
		if (atlasUrl) destroyAtlasGpuTextures(atlasUrl);
		if (urls.length > 0) {
			jobs.push(Assets.unload(urls).catch(() => undefined));
		}
		next = { ...next };
		delete next[key];
	}

	if (TIR_SPRITE_URLS.length > 0) {
		jobs.push(Assets.unload([...TIR_SPRITE_URLS]).catch(() => undefined));
	}

	await Promise.all(jobs);
	return next;
};

export type DismissTirOptions = {
	/** Stage E / pick overlay already cleared open+slide — only unload GPU. */
	uiAlreadyDismissed?: boolean;
};

/**
 * Shared barrier for entry gallery + Stage E: cabinet gone → unload TIR → next heavy UI.
 */
export const dismissTirAndUnloadGpu = async (opts?: DismissTirOptions) => {
	if (!opts?.uiAlreadyDismissed) {
		stateGame.targetShotFlight = null;
		stateGame.targetShotFlips = [];
		stateGame.targetShotFlipLabels = {};
		stateGame.targetPickSlide = 0;
		stateGame.targetPickOpen = false;
		eventEmitter.broadcast({ type: 'targetPickDismiss' });
	}

	await waitAnimationFrames(2);

	if (
		isTirPixiLive({
			targetPickOpen: stateGame.targetPickOpen,
			targetPickSlide: stateGame.targetPickSlide,
			flipCount: stateGame.targetShotFlips.length,
			hasShotFlight: stateGame.targetShotFlight != null,
		})
	) {
		return;
	}

	if (!isPhoneTirGpuUnload()) return;
	if (devPreview.forceShowTargetBoard) return;

	const loaded = stateApp.loadedAssets as Record<string, unknown> | undefined;
	if (!loaded) return;
	if (!TIR_SPINE_KEYS.some((key) => key in loaded)) return;

	stateApp.loadedAssets = await unloadTirPixiGpuAsync(loaded);
};

export const omitParkedTirAssets = <T extends Record<string, unknown>>(loaded: T): T => {
	if (!tirGpuParked) return loaded;
	const next = { ...loaded };
	for (const key of TIR_SPINE_KEYS) delete next[key];
	return next;
};

export const ensureTirPixiInApp = async (stateAppRef: {
	loadedAssets?: Record<string, unknown>;
}) => {
	const loaded = stateAppRef.loadedAssets ?? {};
	const patch = await ensureTirPixiLoaded(loaded);
	if (!patch) return;
	stateAppRef.loadedAssets = { ...loaded, ...patch };
};
