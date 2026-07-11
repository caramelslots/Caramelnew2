/** designer_assets/spin_button — HTML SpinePlayer viewport (skeleton bounds). */
export const SPIN_BUTTON_SPINE_VIEWPORT = {
	x: -460.5,
	y: -462.5,
	width: 921,
	height: 925,
	padLeft: '0%',
	padRight: '0%',
	padTop: '0%',
	padBottom: '0%',
} as const;

/** static/ asset path relative to deployed index.html (Stake CDN subpath-safe). */
export const resolveSpinButtonSpineUrl = (file: string) =>
	new URL(`assets/spines/spinButton/${file}`.replace(/^\//, ''), window.location.href).href;

export const SPIN_BUTTON_SPINE_FILES = [
	'spin_button.json',
	'spin_button.atlas',
	'spin_button.webp',
] as const;

export const SPIN_BUTTON_SPINE_ASSET_URLS = SPIN_BUTTON_SPINE_FILES.map(resolveSpinButtonSpineUrl);

export const SPIN_BUTTON_SPINE_WEBP_URL = resolveSpinButtonSpineUrl('spin_button.webp');

let spinButtonSpinePreloadStarted = false;

/** Warm HTTP cache for HTML Spin HUD assets during the loading-screen idle window. */
export const startSpinButtonSpinePreload = () => {
	if (spinButtonSpinePreloadStarted || typeof window === 'undefined') return;
	spinButtonSpinePreloadStarted = true;

	const queue = [...SPIN_BUTTON_SPINE_ASSET_URLS];
	const workerCount = Math.min(3, queue.length);

	void Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (queue.length > 0) {
				const url = queue.shift();
				if (!url) break;

				try {
					await fetch(url);
				} catch {
					/* Best-effort — SpinePlayer will retry on mount. */
				}
			}
		}),
	);
};
