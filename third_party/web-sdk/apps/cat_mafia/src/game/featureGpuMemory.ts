/**
 * Feature Pixi keys: deferred from base batch, loaded on first need.
 * Dog / popup / outline unload when the feature ends; cartridge stays resident.
 */

import { Assets } from 'pixi.js';
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

const spriteSrcUrl = (key: string): string | undefined => {
	const entry = assets[key as keyof typeof assets];
	if (!entry || entry.type !== 'sprite') return undefined;
	return typeof entry.src === 'string' ? entry.src : undefined;
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

/**
 * Unload feature keys from `loadedAssets` + Assets cache.
 * Does **not** call `destroy(true)` on atlas pages — that races live Spine/BindGroup
 * and freezes the main Pixi ticker with `_resourceId` null errors.
 */
export const unloadFeatureKeys = (
	keys: readonly FeatureGpuKey[],
	loadedAssets: Record<string, unknown>,
): Record<string, unknown> => {
	let next = loadedAssets;
	for (const key of keys) {
		if (!(key in next)) continue;
		const entry = assets[key];
		if (entry?.type === 'spine') {
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

type LoadedAssetsBag = {
	loadedAssets?: Record<string, unknown>;
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
export const FS_POPUP_UNLOAD_DELAY_FRAMES = 6;
