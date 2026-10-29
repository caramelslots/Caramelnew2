import { collectBatchHttpUrls, LOADER_BACKGROUND_KEYS, LOADER_BACKGROUND_TEXTURE_PATHS } from './assetLoadPlan';

/** static/ path relative to deployed index.html (Stake CDN subpath-safe). */
export const resolveGameStaticUrl = (path: string) =>
	new URL(
		path.replace(/^\//, ''),
		typeof window !== 'undefined' ? window.location.href : import.meta.url,
	).href;

let backgroundPreloadStarted = false;

/**
 * Warm the room spines (batch 1, ahead of the rest) so the WebGL street can
 * paint as soon as Pixi uploads them. The opening screen and the slot share
 * this scene — there is no separate still.
 */
export const startEarlyLoaderBackgroundPreload = () => {
	if (backgroundPreloadStarted || typeof window === 'undefined') return;
	backgroundPreloadStarted = true;

	const urls = [
		...collectBatchHttpUrls(LOADER_BACKGROUND_KEYS),
		...LOADER_BACKGROUND_TEXTURE_PATHS.map((path) => resolveGameStaticUrl(path)),
	];
	for (const url of urls) {
		void fetch(url).catch(() => {
			/* Best-effort — Pixi loader will retry. */
		});
	}
};
