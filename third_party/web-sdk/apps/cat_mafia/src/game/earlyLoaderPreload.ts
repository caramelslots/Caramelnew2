/** static/ path relative to deployed index.html (Stake CDN subpath-safe). */
export const resolveGameStaticUrl = (path: string) =>
	new URL(path.replace(/^\//, ''), typeof window !== 'undefined' ? window.location.href : import.meta.url)
		.href;

/**
 * Static street under the logo/cards loader.
 * 1920×940 — same plate aspect as Spine `background_day` (cropped from day.webp).
 */
export const LOADER_STATIC_DAY_URL = resolveGameStaticUrl(
	'assets/sprites/background/day_loader.webp',
);

/** Street background Spine for Pixi `mainBackground` (batch 1 + early HTTP warm). */
export const LOADER_BG_SPINE_URLS = [
	resolveGameStaticUrl('assets/spines/background/skeleton.json'),
	resolveGameStaticUrl('assets/spines/background/skeleton.atlas'),
	resolveGameStaticUrl('assets/spines/background/skeleton.webp'),
	resolveGameStaticUrl('assets/spines/background/skeleton_2.webp'),
	resolveGameStaticUrl('assets/spines/background/skeleton_3.webp'),
] as const;

let backgroundPreloadStarted = false;

/**
 * Warm loader still + street Spine bytes during bootstrap.
 */
export const startEarlyLoaderBackgroundPreload = () => {
	if (backgroundPreloadStarted || typeof window === 'undefined') return;
	backgroundPreloadStarted = true;

	for (const url of [LOADER_STATIC_DAY_URL, ...LOADER_BG_SPINE_URLS]) {
		void fetch(url).catch(() => {
			/* Best-effort — img / Pixi will retry. */
		});
	}
};
