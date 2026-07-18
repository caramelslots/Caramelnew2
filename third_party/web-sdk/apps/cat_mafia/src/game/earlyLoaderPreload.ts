/** static/ path relative to deployed index.html (Stake CDN subpath-safe). */
export const resolveGameStaticUrl = (path: string) =>
	new URL(path.replace(/^\//, ''), typeof window !== 'undefined' ? window.location.href : import.meta.url)
		.href;

/** Bootstrap splash + Pixi `mainBackground` on the press-to-continue screen. */
export const LOADER_NEXT_SCREEN_BG_URL = resolveGameStaticUrl('assets/sprites/background/day.webp');

let backgroundPreloadStarted = false;

/**
 * Warm the next-screen background during the Stake Engine GIF loader so
 * BootstrapLoader / press-to-continue do not flash black while day.webp decodes.
 */
export const startEarlyLoaderBackgroundPreload = () => {
	if (backgroundPreloadStarted || typeof window === 'undefined') return;
	backgroundPreloadStarted = true;

	const img = new Image();
	img.src = LOADER_NEXT_SCREEN_BG_URL;
	if (typeof img.decode === 'function') {
		void img.decode().catch(() => {
			/* Best-effort — CSS background on BootstrapLoader will retry. */
		});
	}
};
