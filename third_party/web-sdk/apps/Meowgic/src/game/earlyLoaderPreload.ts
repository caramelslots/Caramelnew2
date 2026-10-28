/** static/ path relative to deployed index.html (Stake CDN subpath-safe). */
export const resolveGameStaticUrl = (path: string) =>
	new URL(
		path.replace(/^\//, ''),
		typeof window !== 'undefined' ? window.location.href : import.meta.url,
	).href;

/**
 * Baked basegame street still — first paint during bootstrap + cards.
 * Same scene as Pixi `mainBackground` + `bgPlatform` + `bgTable` (purple).
 * Refresh via `node scripts/bake-street-still-serve.mjs` (or copy from
 * `assets/sprites/demo/background.webp` after a designer re-export).
 */
export const LOADER_STATIC_DAY_URL = resolveGameStaticUrl('assets/sprites/background/day.webp');

/** Street background spines for Pixi (batch 1 + early HTTP warm). */
export const LOADER_BG_SPINE_URLS = [
	resolveGameStaticUrl('assets/spines/background/only/bg_only.json'),
	resolveGameStaticUrl('assets/spines/background/only/bg_only.atlas'),
	resolveGameStaticUrl('assets/spines/background/only/bg_only.webp'),
	resolveGameStaticUrl('assets/spines/background/platform/bg_platform.json'),
	resolveGameStaticUrl('assets/spines/background/platform/bg_platform.atlas'),
	resolveGameStaticUrl('assets/spines/background/platform/bg_platform.webp'),
	resolveGameStaticUrl('assets/spines/background/table/bg_table.json'),
	resolveGameStaticUrl('assets/spines/background/table/bg_table.atlas'),
	resolveGameStaticUrl('assets/spines/background/table/bg_table.webp'),
] as const;

let backgroundPreloadStarted = false;

/** Warm the baked street still as early as possible (first bundle / splash). */
export const startEarlyLoaderBackgroundPreload = () => {
	if (backgroundPreloadStarted || typeof window === 'undefined') return;
	backgroundPreloadStarted = true;

	void fetch(LOADER_STATIC_DAY_URL).catch(() => {
		/* Best-effort — img will retry. */
	});
};
