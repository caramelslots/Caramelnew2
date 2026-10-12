/** static/ path relative to deployed index.html (Stake CDN subpath-safe). */
export const resolveGameStaticUrl = (path: string) =>
	new URL(
		path.replace(/^\//, ''),
		typeof window !== 'undefined' ? window.location.href : import.meta.url,
	).href;

/** Intro loader sky plate (1950×1339). */
export const LOADER_INTRO_SKY_URL = resolveGameStaticUrl('assets/sprites/loader/intro_sky.png');

/** Intro loader house roofs plate (1950×1339, alpha). */
export const LOADER_INTRO_ROOFS_URL = resolveGameStaticUrl('assets/sprites/loader/intro_roofs.png');

/** Intro loader clouds strip (1295×356, alpha) — scrolls over sky, under roofs. */
export const LOADER_INTRO_CLOUDS_URL = resolveGameStaticUrl(
	'assets/sprites/loader/intro_clouds.png',
);

/** @deprecated Replaced by intro sky + roofs — kept for Pixi layout reference. */
export const LOADER_STATIC_DAY_URL = resolveGameStaticUrl('assets/sprites/background/day.webp');

/** Street background Spine for Pixi `mainBackground` (batch 1 + early HTTP warm). */
export const LOADER_BG_SPINE_URLS = [
	resolveGameStaticUrl('assets/spines/background/skeleton.json'),
	resolveGameStaticUrl('assets/spines/background/skeleton.atlas'),
	resolveGameStaticUrl('assets/spines/background/skeleton.webp'),
	resolveGameStaticUrl('assets/spines/background/skeleton_2.webp'),
	resolveGameStaticUrl('assets/spines/background/skeleton_3.webp'),
] as const;

let backgroundPreloadStarted = false;

/** Warm intro loader plates during bootstrap. */
export const startEarlyLoaderBackgroundPreload = () => {
	if (backgroundPreloadStarted || typeof window === 'undefined') return;
	backgroundPreloadStarted = true;

	void fetch(LOADER_INTRO_SKY_URL).catch(() => {
		/* Best-effort — img will retry. */
	});
	void fetch(LOADER_INTRO_ROOFS_URL).catch(() => {
		/* Best-effort — img will retry. */
	});
	void fetch(LOADER_INTRO_CLOUDS_URL).catch(() => {
		/* Best-effort — img will retry. */
	});
};
