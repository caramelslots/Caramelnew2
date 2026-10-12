/**
 * Dev-only demo board + background stills (`designer_assets/board демо`, `демо фон`).
 * Loaded on demand when the Stage → Demo Art toggle turns on — not in the prod path.
 *
 * Demo board art has a lower playfield (book on top) than the Spine `board` mesh.
 * `DEMO_BOARD_FIT` maps that painted window onto the Spine playfield inside
 * `BOARD_DESK_CONTENT` so reels sit inside the desk like production.
 */
import * as PIXI from 'pixi.js';
import type { LoadedAssets } from 'pixi-svelte';
import { getProcessed } from '../../../../packages/pixi-svelte/src/lib/assetLoad';

import { resolveGameStaticUrl } from './earlyLoaderPreload';

export type DemoStageArtKey = 'demoBackground' | 'demoBoard';

/** Native background plate — matches Spine street plate (1920×940). */
export const DEMO_BACKGROUND_CONTENT = { width: 1920, height: 940 } as const;

/** Native designer demo board still (`board.webp`). */
export const DEMO_BOARD_CONTENT = { width: 2001, height: 1599 } as const;

/**
 * Fit demo `board.webp` into the Spine `board` rect so painted playfields align.
 * UV fractions of that rect (origin top-left, +y down), applied about its centre:
 *   display = centre + (artUV − 0.5) * scale + offset
 * Recompute if the demo still is re-exported with a different inner window.
 */
export const DEMO_BOARD_FIT = {
	/** Wider than Spine playfield align — more side margin around reels. */
	scaleX: 1.26,
	/** Height tuned so top/bottom chrome clears the symbol stack. */
	scaleY: 1.05,
	offsetX: -0.008258,
	offsetY: -0.089,
} as const;

/** Bump when demo board.webp / fit is re-tuned so Pixi drops the cached texture. */
const DEMO_BOARD_CACHE_VER = 'fit2';

const DEMO_KEYS: readonly DemoStageArtKey[] = ['demoBackground', 'demoBoard'];

type LoadedAssetsHost = { loadedAssets: LoadedAssets };

const demoSrc = (key: DemoStageArtKey) => {
	const path =
		key === 'demoBackground'
			? 'assets/sprites/demo/background.webp'
			: `assets/sprites/demo/board.webp?v=${DEMO_BOARD_CACHE_VER}`;
	return resolveGameStaticUrl(path);
};

export const isDemoStageArtLoaded = (loadedAssets: LoadedAssets | undefined) =>
	DEMO_KEYS.every((key) => Boolean(loadedAssets?.[key]));

/**
 * Load demo stills into the live Pixi `loadedAssets` map (context `stateApp`).
 * Pass the host from `getContextApp().stateApp` so HMR cannot fork a second map.
 */
export const ensureDemoStageArtInPixi = async (host: LoadedAssetsHost) => {
	if (isDemoStageArtLoaded(host.loadedAssets)) return;

	const loaded = await Promise.all(
		DEMO_KEYS.map(async (key) => {
			const src = demoSrc(key);
			try {
				if (PIXI.Assets.cache.has(src)) await PIXI.Assets.unload(src);
			} catch {
				/* not cached */
			}
			const rawAsset = await PIXI.Assets.load(src);
			return getProcessed({ key, rawAsset, type: 'sprite', src }) ?? {};
		}),
	);

	const merged = loaded.reduce((acc, cur) => ({ ...acc, ...cur }), {} as LoadedAssets);
	host.loadedAssets = {
		...host.loadedAssets,
		...merged,
	};
};

/** Drop demo textures so the next Show Demo Art reloads from disk. */
export const evictDemoStageArtFromPixi = async (host: LoadedAssetsHost) => {
	const next = { ...host.loadedAssets };
	for (const key of DEMO_KEYS) {
		delete next[key];
		const src = demoSrc(key);
		try {
			if (PIXI.Assets.cache.has(src)) await PIXI.Assets.unload(src);
		} catch {
			/* already gone */
		}
	}
	host.loadedAssets = next;
};
