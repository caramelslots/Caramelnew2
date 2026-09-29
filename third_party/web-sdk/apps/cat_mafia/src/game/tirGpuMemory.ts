/**
 * Drop tir (gallery + Stage E) GPU after the cabinet is off-screen.
 * Extra FS / Super curtains are never touched. Next tir reloads via ensureTirPixiLoaded.
 */

import { Assets } from 'pixi.js';
import type { TextureAtlas } from '@esotericsoftware/spine-core';
import { SpineTexture } from '@esotericsoftware/spine-pixi-v8';
import { getProcessed } from '../../../../packages/pixi-svelte/src/lib/assetLoad';

import assets from './assets';
import {
	forgetCappedAtlasImageSources,
	isPhoneForAtlasDownscale,
	PHONE_SPINE_ATLAS_MAX_EDGE,
	prepareCappedAtlasImageSources,
} from './phoneSpineAtlasDownscale';
import { devPreview } from './devPreview.svelte';
import { eventEmitter } from './eventEmitter';
import { releaseCpuTwinsForUrls } from './releaseCpuTextureTwins';
import { SHOT_BULLET_SPRITES } from './shotBulletAssets';
import { evictSpineAssetUrls, evictSpineAtlasAndPages } from './spineAtlasEvict';
import { stateApp } from './stateApp';
import { stateGame } from './stateGame.svelte';
import {
	ensureTargetBoardSpritesInPixi,
	spriteUrlsForTirCabinet,
	TARGET_BOARD_SPRITE_URLS,
	type TirCabinetMode,
} from './targetBoardAssets';

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

/** Sprite + spine atlas/page URLs for the live cabinet (never both BGs). */
const tirTwinReleaseUrls = (mode?: TirCabinetMode): string[] => {
	const urls = new Set<string>();
	if (mode) {
		for (const url of spriteUrlsForTirCabinet(mode)) urls.add(url);
	} else {
		for (const url of TIR_SPRITE_URLS) urls.add(url);
	}
	urls.add(SHOT_BULLET_SPRITES.bullet);
	for (const key of TIR_SPINE_KEYS) {
		for (const url of spineSrcUrls(key)) urls.add(url);
	}
	return [...urls];
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

/** After GPU paint: drop CPU decode twins for tir only (not global Cache). */
const releaseTirCpuTwinsSoon = (mode?: TirCabinetMode) => {
	const urls = tirTwinReleaseUrls(mode);
	void waitAnimationFrames(2).then(() => {
		const pixi = stateApp.pixiApplication ?? null;
		releaseCpuTwinsForUrls(urls, pixi);
	});
};

/** Serialize unload ↔ Stage E reload so a late FS drop cannot wipe the cabinet. */
let tirAssetGate: Promise<void> = Promise.resolve();

const withTirAssets = async <T>(fn: () => Promise<T>): Promise<T> => {
	let release: () => void = () => undefined;
	const previous = tirAssetGate;
	tirAssetGate = new Promise<void>((resolve) => {
		release = resolve;
	});
	await previous;
	try {
		return await fn();
	} finally {
		release();
	}
};

const atlasPagesLive = (atlasUrl: string) => {
	try {
		const atlas = Assets.get(atlasUrl) as TextureAtlas | undefined;
		if (!atlas?.pages?.length) return false;
		return atlas.pages.every((page) => {
			const pixiTex = (page.texture as SpineTexture | null)?.texture;
			return Boolean(pixiTex && !pixiTex.destroyed && !pixiTex.source?.destroyed);
		});
	} catch {
		return false;
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

/**
 * Frames after tir UI unmount before Assets.unload.
 * Too few → BindGroups still hold TextureSources → `alphaMode` / `_resourceId` null.
 */
export const TIR_UNLOAD_DELAY_FRAMES = 8;

/** Evict atlas + skeleton + page `.webp` (not just .atlas/.json). */
const evictTirSpineKey = async (key: TirSpineKey) => {
	const atlasUrl = (assets[key] as { src?: { atlas?: string } })?.src?.atlas;
	const skeletonUrl = (assets[key] as { src?: { skeleton?: string } })?.src?.skeleton;
	if (atlasUrl) {
		forgetCappedAtlasImageSources(atlasUrl);
		await evictSpineAtlasAndPages(atlasUrl, skeletonUrl);
		return;
	}
	const urls = spineSrcUrls(key);
	if (urls.length > 0) await evictSpineAssetUrls(urls);
};

export const unloadTirPixiGpu = (loadedAssets: Record<string, unknown>): Record<string, unknown> => {
	tirGpuParked = true;
	let next = loadedAssets;
	for (const key of TIR_SPINE_KEYS) {
		void evictTirSpineKey(key);
		if (!(key in next)) continue;
		next = { ...next };
		delete next[key];
	}
	if (TIR_SPRITE_URLS.length > 0) void evictSpineAssetUrls(TIR_SPRITE_URLS);
	return next;
};

export const ensureTirPixiLoaded = async (
	loadedAssets: Record<string, unknown>,
	mode?: TirCabinetMode,
): Promise<Record<string, unknown> | null> =>
	withTirAssets(async () => {
		if (mode) await ensureTargetBoardSpritesInPixi(mode);

		const patch: Record<string, unknown> = {};
		const phone = isPhoneForAtlasDownscale();

		for (const key of TIR_SPINE_KEYS) {
			const entry = assets[key];
			if (!entry || entry.type !== 'spine') continue;
			if (loadedAssets[key] || patch[key]) continue;

			const loadSrc = spineSrcUrls(key);
			const atlasUrl = (entry.src as { atlas?: string })?.atlas;
			const skeletonUrl = (entry.src as { skeleton?: string })?.skeleton;
			if (atlasUrl && !atlasPagesLive(atlasUrl)) {
				await evictSpineAtlasAndPages(atlasUrl, skeletonUrl);
			}

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
		}

		if (Object.keys(patch).length === 0) {
			if (mode) {
				tirGpuParked = false;
				releaseTirCpuTwinsSoon(mode);
			}
			return null;
		}
		tirGpuParked = false;
		releaseTirCpuTwinsSoon(mode);
		return patch;
	});

/**
 * Awaitable TIR GPU drop after the cabinet is off-screen.
 * Always evicts atlas + page `.webp` even if `loadedAssets` keys were already parked.
 * Next gallery / Stage E reloads via ensureTirPixiLoaded.
 */
export const unloadTirPixiGpuAsync = async (
	loadedAssets: Record<string, unknown>,
): Promise<Record<string, unknown>> =>
	withTirAssets(async () => {
		tirGpuParked = true;
		let next = loadedAssets;

		for (const key of TIR_SPINE_KEYS) {
			await evictTirSpineKey(key);
			if (!(key in next)) continue;
			next = { ...next };
			delete next[key];
		}

		await evictSpineAssetUrls(TIR_SPRITE_URLS);
		return next;
	});

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

	// Let Sprite/Spine leave the stage + BindGroups before Assets.unload.
	await waitAnimationFrames(TIR_UNLOAD_DELAY_FRAMES);

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

	if (devPreview.forceShowTargetBoard) return;

	const loaded = (stateApp.loadedAssets ?? {}) as Record<string, unknown>;
	stateApp.loadedAssets = await unloadTirPixiGpuAsync(loaded);
};

export const omitParkedTirAssets = <T extends Record<string, unknown>>(loaded: T): T => {
	if (!tirGpuParked) return loaded;
	const next = { ...loaded };
	for (const key of TIR_SPINE_KEYS) delete next[key];
	return next;
};

export const ensureTirPixiInApp = async (
	stateAppRef: {
		loadedAssets?: Record<string, unknown>;
	},
	mode?: TirCabinetMode,
) => {
	const loaded = stateAppRef.loadedAssets ?? {};
	const patch = await ensureTirPixiLoaded(loaded, mode);
	if (!patch) return;
	stateAppRef.loadedAssets = { ...stateAppRef.loadedAssets, ...patch };
};
