/**
 * Tir (gallery + Stage E) helpers.
 * Phone VRAM unload/park was removed — spines stay in loadedAssets like desktop.
 */

import { Assets } from 'pixi.js';
import { getProcessed } from '../../../../packages/pixi-svelte/src/lib/assetLoad';

import assets from './assets';
import {
	downscalePhoneSpineAtlases,
	isPhoneForAtlasDownscale,
	PHONE_SPINE_ATLAS_MAX_EDGE,
	prepareCappedAtlasImageSources,
} from './phoneSpineAtlasDownscale';
import { eventEmitter } from './eventEmitter';
import { stateGame } from './stateGame.svelte';

export const TIR_SPINE_KEYS = ['targetBoardFlip', 'shotBullet'] as const;
export type TirSpineKey = (typeof TIR_SPINE_KEYS)[number];

/** Stage E rapid taps — cap concurrent flip spines on phone. */
export const PHONE_MAX_PARALLEL_TIR_FLIPS = 2;

const spineSrcUrls = (key: TirSpineKey): string[] => {
	const entry = assets[key];
	if (!entry || entry.type !== 'spine') return [];
	return Object.values(entry.src).filter((v): v is string => typeof v === 'string');
};

/** Load tir spines if missing (batch 4 normally has them; no unload path anymore). */
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

export type DismissTirOptions = {
	/** Stage E / pick overlay already cleared open+slide — skip UI dismiss. */
	uiAlreadyDismissed?: boolean;
};

/**
 * Gallery / Stage E barrier: snap cabinet off, then continue (intro / theme).
 * No longer drops tir GPU — assets stay resident.
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
};

export const ensureTirPixiInApp = async (stateAppRef: {
	loadedAssets?: Record<string, unknown>;
}) => {
	const loaded = stateAppRef.loadedAssets ?? {};
	const patch = await ensureTirPixiLoaded(loaded);
	if (!patch) return;
	stateAppRef.loadedAssets = { ...loaded, ...patch };
};
