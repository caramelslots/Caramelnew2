import {
	collectBatch1EarlyPreloadUrls,
	collectBatch2EarlyPreloadUrls,
	collectBatchHttpUrls,
	getBatch3KeysForLocale,
} from './assetLoadPlan';
import { knewaveFontUrl } from './knewaveFont';
import { startEarlyLoaderBackgroundPreload } from './earlyLoaderPreload';
import { preloadLoaderCardBonusPixi } from './loaderCardBonusPixi';
import { resolveLanguage } from 'state-shared';

const warmHttpCache = async (urls: readonly string[], concurrency: number) => {
	if (urls.length === 0) return;

	const queue = [...urls];
	const workerCount = Math.min(concurrency, queue.length);

	await Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (queue.length > 0) {
				const url = queue.shift();
				if (!url) break;

				try {
					await fetch(url);
				} catch {
					/* Best-effort warm-up — Pixi loader will retry. */
				}
			}
		}),
	);
};

let batch1Started = false;
let batch2Started = false;

/**
 * Warm only batch 1 + loader still during splash.
 * Do not start batch 2/3 here — parallel fetches starve Pixi batch 1.
 */
export const startEarlyAssetPreload = () => {
	if (batch1Started || typeof window === 'undefined') return;
	batch1Started = true;

	startEarlyLoaderBackgroundPreload();
	void warmHttpCache(collectBatch1EarlyPreloadUrls(), 4);
	void warmHttpCache([knewaveFontUrl()], 1);
};

/** Warm batch-2 bytes during Bootstrap (parallel with gated Pixi batch 2). */
export const startBatch2EarlyPreload = () => {
	if (batch2Started || typeof window === 'undefined') return;
	batch2Started = true;

	void warmHttpCache(collectBatch2EarlyPreloadUrls(), 8);
	void preloadLoaderCardBonusPixi();
};

let batch3Started = false;

/**
 * Warm batch-3 bytes during Bootstrap so that by the time the cards stage
 * begins, the browser HTTP cache already holds the essential pre-continue
 * assets (bonus bar, win variants, coins, HUD sprites, locale fonts).
 * Called at the same time as setLoaderStage('bootstrap') to maximise the
 * 2300 ms Bootstrap window.
 *
 * Uses the same locale-aware key filter as GameAssetsLoader so we only
 * pre-fetch the font files the player will actually need.
 */
export const startBatch3EarlyPreload = () => {
	if (batch3Started || typeof window === 'undefined') return;
	batch3Started = true;

	const params = new URLSearchParams(window.location.search);
	const locale = resolveLanguage(params.get('lang'), {
		social: params.get('social') === 'true',
	});
	const batch3Keys = getBatch3KeysForLocale(locale);
	void warmHttpCache(collectBatchHttpUrls(batch3Keys), 6);
};
