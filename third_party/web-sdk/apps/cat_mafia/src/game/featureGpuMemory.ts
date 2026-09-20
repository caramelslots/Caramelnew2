/**
 * Pixi keys that must not sit in base-game VRAM.
 * Loaded on first FS / duel / tir, unloaded when that feature ends.
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

export const FS_CARTRIDGE_KEYS = ['BT', 'BTImg'] as const;
export const DUEL_MASCOT_KEYS = ['mascotDog'] as const;
/** Column anticipation VFX — basegame B/BD slow only. */
export const FS_OUTLINE_KEYS = ['outlineReel'] as const;

/** Skip these in post-lift batch 4 — they are feature-only. */
export const BATCH4_DEFERRED_KEYS = [
	...FS_CARTRIDGE_KEYS,
	...DUEL_MASCOT_KEYS,
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

const spineSrcUrls = (key: string): string[] => {
	const entry = assets[key as keyof typeof assets];
	if (!entry || entry.type !== 'spine') return [];
	return Object.values(entry.src).filter((value): value is string => typeof value === 'string');
};

const spriteSrcUrl = (key: string): string | undefined => {
	const entry = assets[key as keyof typeof assets];
	if (!entry || entry.type !== 'sprite') return undefined;
	return typeof entry.src === 'string' ? entry.src : undefined;
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

export const unloadFeatureKeys = (
	keys: readonly FeatureGpuKey[],
	loadedAssets: Record<string, unknown>,
): Record<string, unknown> => {
	let next = loadedAssets;
	for (const key of keys) {
		if (!(key in next)) continue;
		const entry = assets[key];
		if (entry?.type === 'spine') {
			const atlasUrl = (entry.src as { atlas?: string })?.atlas;
			if (atlasUrl) destroyAtlasGpuTextures(atlasUrl);
			const urls = spineSrcUrls(key);
			if (urls.length > 0) {
				void Assets.unload(urls).catch(() => undefined);
			}
		} else {
			const url = spriteSrcUrl(key);
			if (url) void Assets.unload(url).catch(() => undefined);
		}
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
