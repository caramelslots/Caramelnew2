/**
 * Feature Pixi keys: deferred from base batch, loaded on first need.
 * Dog / popup / outline unload when the feature ends; cartridge stays resident.
 */

import { Assets } from 'pixi.js';
import type { TextureAtlas } from '@esotericsoftware/spine-core';
import { SpineTexture } from '@esotericsoftware/spine-pixi-v8';
import { stateBet, stateModal } from 'state-shared';
import { getProcessed } from '../../../../packages/pixi-svelte/src/lib/assetLoad';

import assets from './assets';
import { devPreview } from './devPreview.svelte';
import { stateGame } from './stateGame.svelte';
import { isDuelBetMode, stateDuel } from './stateDuel.svelte';
import { evictSpineAssetUrls, evictSpineAtlasAndPages } from './spineAtlasEvict';

export const FS_CARTRIDGE_KEYS = ['BT', 'BTImg'] as const;
export const DUEL_MASCOT_KEYS = ['mascotDog'] as const;
/** Column anticipation VFX — basegame B/BD slow only. */
export const FS_OUTLINE_KEYS = ['outlineReel'] as const;
/** FS / duel outro panel (`total_win` / fs total) — not base VRAM. */
export const FS_POPUP_KEYS = ['fsPopup'] as const;

/** Skip these in post-lift batch 4 — they are feature-only. */
export const BATCH4_DEFERRED_KEYS = [
	...FS_CARTRIDGE_KEYS,
	...DUEL_MASCOT_KEYS,
	...FS_POPUP_KEYS,
	'mascotCat',
	'shotBullet',
	'targetBoardFlip',
] as const;

export type FeatureGpuKey =
	| (typeof BATCH4_DEFERRED_KEYS)[number]
	| (typeof FS_OUTLINE_KEYS)[number];

/**
 * Portrait duel play: flanking Pixi mascots are not mounted (desks only).
 * Phone landscape / desktop still show cat + dog beside the boards.
 */
export const areDuelBoardMascotsParked = (isPortrait: boolean) => {
	if (!isPortrait) return false;
	if (stateDuel.active) return true;
	return stateGame.transitionActive && isDuelBetMode(stateBet.activeBetModeKey);
};

/** Load dog before the cloud reveal — skip portrait, where flanking mascots never mount. */
export const shouldKeepDuelMascotGpu = (isPortrait = false) => {
	if (devPreview.mascotDogAnimation !== null) return true;
	if (isPortrait) return false;
	return (
		stateDuel.active ||
		stateDuel.phase !== 'idle' ||
		stateDuel.playerSide != null ||
		stateGame.duelIntroActive ||
		isDuelBetMode(stateBet.activeBetModeKey) ||
		stateModal.modal?.name === 'buyDuelPick'
	);
};

/** bonusReel outline — drop in FS, keep on base (and DEV pin). */
export const shouldKeepOutlineReelGpu = () =>
	devPreview.forceShowBonusReelAllColumns ||
	!(stateGame.gameType === 'freegame' && stateGame.transitionGameType !== 'basegame');

/** total_win spine — load for FS / duel outro, drop on settled base. */
export const shouldKeepFsPopupGpu = () =>
	stateGame.gameType === 'freegame' ||
	stateGame.transitionGameType === 'freegame' ||
	stateGame.freeSpinIntroActive ||
	stateGame.winOverlayActive ||
	stateDuel.active ||
	stateDuel.phase !== 'idle';

const spineSrcUrls = (key: string): string[] => {
	const entry = assets[key as keyof typeof assets];
	if (!entry || entry.type !== 'spine') return [];
	return Object.values(entry.src).filter((value): value is string => typeof value === 'string');
};

const spineAtlasUrl = (key: string): string | undefined => {
	const entry = assets[key as keyof typeof assets];
	if (!entry || entry.type !== 'spine') return undefined;
	const atlas = (entry.src as { atlas?: string }).atlas;
	return typeof atlas === 'string' ? atlas : undefined;
};

const spriteSrcUrl = (key: string): string | undefined => {
	const entry = assets[key as keyof typeof assets];
	if (!entry || entry.type !== 'sprite') return undefined;
	return typeof entry.src === 'string' ? entry.src : undefined;
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

const evictFeatureSpineKey = async (key: string) => {
	const atlasUrl = spineAtlasUrl(key);
	const skeletonUrl = (() => {
		const entry = assets[key as keyof typeof assets];
		if (!entry || entry.type !== 'spine') return undefined;
		const skeleton = (entry.src as { skeleton?: string }).skeleton;
		return typeof skeleton === 'string' ? skeleton : undefined;
	})();
	if (atlasUrl) {
		await evictSpineAtlasAndPages(atlasUrl, skeletonUrl);
		return;
	}
	const urls = spineSrcUrls(key);
	if (urls.length > 0) await evictSpineAssetUrls(urls);
};

export const ensureFeatureKeyLoaded = async (
	key: FeatureGpuKey,
	loadedAssets: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
	if (loadedAssets[key]) return null;
	const entry = assets[key];
	if (!entry) return null;

	if (entry.type === 'spine') {
		const loadSrc = spineSrcUrls(key);
		if (loadSrc.length === 0) return null;
		const atlasUrl = spineAtlasUrl(key);
		const skeletonUrl = (entry.src as { skeleton?: string }).skeleton;
		// After base-return unload, Cache may still hold a dead atlas — wipe before reload.
		if (atlasUrl && !atlasPagesLive(atlasUrl)) {
			await evictSpineAtlasAndPages(atlasUrl, skeletonUrl);
		}
		const rawAsset = await Assets.load(loadSrc);
		const processed = getProcessed({
			key,
			rawAsset: rawAsset as Parameters<typeof getProcessed>[0]['rawAsset'],
			type: entry.type,
			src: entry.src,
		});
		return processed ? (processed as Record<string, unknown>) : null;
	}

	if (entry.type === 'sprite' && typeof entry.src === 'string') {
		const rawAsset = await Assets.load(entry.src);
		const processed = getProcessed({
			key,
			rawAsset: rawAsset as Parameters<typeof getProcessed>[0]['rawAsset'],
			type: entry.type,
			src: entry.src,
		});
		return processed ? (processed as Record<string, unknown>) : null;
	}

	return null;
};

/**
 * Drop feature keys from `loadedAssets` and Assets.Cache (including atlas page `.webp`).
 * Caller must wait for unmount / BindGroup release (see FS_POPUP_UNLOAD_DELAY_FRAMES).
 * Cartridge is never passed here — it stays resident after first FS.
 */
export const unloadFeatureKeys = (
	keys: readonly FeatureGpuKey[],
	loadedAssets: Record<string, unknown>,
): Record<string, unknown> => {
	let next = loadedAssets;
	for (const key of keys) {
		const entry = assets[key];
		if (entry?.type === 'spine') {
			void evictFeatureSpineKey(key);
		} else {
			const url = spriteSrcUrl(key);
			if (url) void evictSpineAssetUrls([url]);
		}
		if (!(key in next)) continue;
		next = { ...next };
		delete next[key];
	}
	return next;
};

/** Awaitable variant — prefer this after the frame barrier so Cache is cleared before reload. */
export const unloadFeatureKeysAsync = async (
	keys: readonly FeatureGpuKey[],
	loadedAssets: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
	let next = loadedAssets;
	for (const key of keys) {
		const entry = assets[key];
		if (entry?.type === 'spine') {
			await evictFeatureSpineKey(key);
		} else {
			const url = spriteSrcUrl(key);
			if (url) await evictSpineAssetUrls([url]);
		}
		if (!(key in next)) continue;
		next = { ...next };
		delete next[key];
	}
	return next;
};

export const ensureFeatureKeysLoaded = async (
	keys: readonly FeatureGpuKey[],
	loadedAssets: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
	const patch: Record<string, unknown> = {};
	for (const key of keys) {
		const next = await ensureFeatureKeyLoaded(key, { ...loadedAssets, ...patch });
		if (next) Object.assign(patch, next);
	}
	return Object.keys(patch).length > 0 ? patch : null;
};

type LoadedAssetsBag = {
	loadedAssets?: Record<string, unknown>;
};

/** Ensure `outlineReel` is in loadedAssets before cat-slow mounts columns. */
export const ensureOutlineReelReady = async (stateApp: LoadedAssetsBag) => {
	const loaded = (stateApp.loadedAssets ?? {}) as Record<string, unknown>;
	if (loaded.outlineReel) return;
	const patch = await ensureFeatureKeysLoaded(FS_OUTLINE_KEYS, loaded);
	if (!patch) return;
	stateApp.loadedAssets = { ...(stateApp.loadedAssets ?? {}), ...patch };
};

/** Ensure `fsPopup` is in loadedAssets before FreeSpinAnimation mounts. */
export const ensureFsPopupReady = async (stateApp: LoadedAssetsBag) => {
	const loaded = (stateApp.loadedAssets ?? {}) as Record<string, unknown>;
	if (loaded.fsPopup) return;
	const patch = await ensureFeatureKeysLoaded(FS_POPUP_KEYS, loaded);
	if (!patch) return;
	stateApp.loadedAssets = { ...(stateApp.loadedAssets ?? {}), ...patch };
};

/** Frames to wait after keep→false before unloading fsPopup (outro unmount). */
export const FS_POPUP_UNLOAD_DELAY_FRAMES = 8;
