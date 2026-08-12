/** static/ path relative to deployed index.html (Stake CDN subpath-safe). */
export const resolveGameStaticUrl = (path: string) =>
	new URL(path.replace(/^\//, ''), typeof window !== 'undefined' ? window.location.href : import.meta.url)
		.href;

/** Street background Spine used by BootstrapLoader (same as Pixi `mainBackground`). */
export const LOADER_BG_SPINE_URLS = [
	resolveGameStaticUrl('assets/spines/background/skeleton.json'),
	resolveGameStaticUrl('assets/spines/background/skeleton.atlas'),
	resolveGameStaticUrl('assets/spines/background/skeleton.webp'),
	resolveGameStaticUrl('assets/spines/background/skeleton_2.webp'),
	resolveGameStaticUrl('assets/spines/background/skeleton_3.webp'),
] as const;

let backgroundPreloadStarted = false;

/**
 * Warm BootstrapLoader background Spine during the Stake Engine GIF loader
 * so the splash does not flash black while atlas pages decode.
 */
export const startEarlyLoaderBackgroundPreload = () => {
	if (backgroundPreloadStarted || typeof window === 'undefined') return;
	backgroundPreloadStarted = true;

	for (const url of LOADER_BG_SPINE_URLS) {
		void fetch(url).catch(() => {
			/* Best-effort — SpinePlayer will retry. */
		});
	}
};
