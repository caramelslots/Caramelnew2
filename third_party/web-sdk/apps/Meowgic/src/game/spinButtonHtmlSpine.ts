/** designer_assets/spin — HTML SpinePlayer viewport (skeleton bounds). */
export const SPIN_BUTTON_SPINE_VIEWPORT = {
	x: -511.0193,
	y: -511.0193,
	width: 1022.0385,
	height: 1022.0385,
	padLeft: '0%',
	padRight: '0%',
	padTop: '0%',
	padBottom: '0%',
} as const;

/** New export renamed the press clip from `animation` to `spin`. */
export const SPIN_BUTTON_SPIN_ANIMATION = 'spin';

/**
 * Hold frame inside `spin` where the square (`base`) is fully on and the
 * arrow stack (`spin` bone) is scaled to ~0. After this the clip restores
 * arrows — we pause here until reels settle, then snap idle (t=0).
 */
export const SPIN_BUTTON_SQUARE_HOLD_TIME = 0.5666666;

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
