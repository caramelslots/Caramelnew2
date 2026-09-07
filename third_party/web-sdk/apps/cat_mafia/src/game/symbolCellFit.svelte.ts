/**
 * Runtime cache: assetKey → sizeRatio that puts the idle silhouette at
 * CELL_SYMBOL_SIZE of the reel cell. Filled once assets are loaded.
 */

import type { SkeletonData } from '@esotericsoftware/spine-pixi-v8';

import { sizeRatioForSilhouette } from './spineSilhouetteFit';

/** Letter lows — auto-equalize regardless of packed art size. */
export const AUTO_CELL_FIT_KEYS = ['L1', 'L2', 'L3', 'L4'] as const;

export type AutoCellFitKey = (typeof AUTO_CELL_FIT_KEYS)[number];

type FitState = {
	/** Uniform sizeRatio (width = height) per spine asset key. */
	ratios: Partial<Record<string, number>>;
	/** Bumps when ratios change so Svelte dependents re-read. */
	version: number;
};

export const symbolCellFit: FitState = $state({
	ratios: {},
	version: 0,
});

export const getAutoCellFitRatio = (assetKey: string): number | undefined => {
	// Touch version so callers inside $derived track updates.
	void symbolCellFit.version;
	return symbolCellFit.ratios[assetKey];
};

/**
 * Measure idle silhouettes for every loaded auto-fit key and store ratios.
 * Safe to call multiple times — skips keys already fitted.
 */
export const ensureSymbolCellFits = (
	loadedAssets: Record<string, unknown> | undefined,
	targetCellFill: number,
) => {
	if (!loadedAssets) return;

	let changed = false;
	for (const key of AUTO_CELL_FIT_KEYS) {
		if (symbolCellFit.ratios[key] !== undefined) continue;
		const data = loadedAssets[key] as SkeletonData | undefined;
		if (!data?.height) continue;

		const anim = data.findAnimation('idle')
			? 'idle'
			: data.findAnimation('stop')
				? 'stop'
				: undefined;
		const ratio = sizeRatioForSilhouette(data, {
			targetCellFill,
			animationName: anim,
		});
		if (ratio === null || !Number.isFinite(ratio) || ratio <= 0) continue;

		symbolCellFit.ratios[key] = ratio;
		changed = true;
	}

	if (changed) symbolCellFit.version += 1;
};
