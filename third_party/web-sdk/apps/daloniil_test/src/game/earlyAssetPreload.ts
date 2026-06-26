import { collectEarlyPreloadUrls } from './assetLoadPlan';

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

let started = false;

/**
 * Start downloading critical asset bytes as early as possible (layout mount),
 * in parallel with Stake GIF / Bootstrap / RGS auth — before Pixi exists.
 */
export const startEarlyAssetPreload = () => {
	if (started || typeof window === 'undefined') return;
	started = true;

	void warmHttpCache(collectEarlyPreloadUrls(), 8);
};
