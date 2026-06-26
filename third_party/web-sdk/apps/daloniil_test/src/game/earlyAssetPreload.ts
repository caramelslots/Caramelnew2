import {
	collectBatch1EarlyPreloadUrls,
	collectBatch2EarlyPreloadUrls,
} from './assetLoadPlan';

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
 * Start downloading batch-1 bytes during the Stake GIF, before Pixi / RGS auth.
 * Includes loader card PNGs so the cards screen can paint immediately.
 */
export const startEarlyAssetPreload = () => {
	if (batch1Started || typeof window === 'undefined') return;
	batch1Started = true;

	void warmHttpCache(collectBatch1EarlyPreloadUrls(), 8);
};

/** Warm batch-2 bytes during Bootstrap (parallel with gated Pixi batch 2). */
export const startBatch2EarlyPreload = () => {
	if (batch2Started || typeof window === 'undefined') return;
	batch2Started = true;

	void warmHttpCache(collectBatch2EarlyPreloadUrls(), 8);
};
