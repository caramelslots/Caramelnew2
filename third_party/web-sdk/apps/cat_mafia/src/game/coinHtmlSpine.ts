/** Designer coin Spine — live playback of every clip from `coins_3x3`. */

import { Physics, SpinePlayer } from '@esotericsoftware/spine-player';

import {
	COIN_PAW_SOURCE_SIZE,
	coinPawSkinForTier,
	drawCoinPawLive,
	type CoinPawSkin,
} from './coinSpriteSheet';
import { isHtmlWebglPaused } from './htmlWebglPause';

export { coinPawSkinForTier };

export const COIN_PAW_SPINE_SKIN: Record<CoinPawSkin, string> = {
	bronze: 'coin_bronze',
	silver: 'coin_silver',
	gold: 'coin_gold',
};

export const COIN_PAW_APPEAR_CLIP = 'appear_flash';
export const COIN_PAW_FLASH_CLIP = 'flash';

export type CoinPawSpineMode = 'row' | 'flash';

/** Same 256² viewport window as the HTML paw-coin cell crop. */
export const COIN_PAW_SPINE_VIEWPORT = {
	x: -300,
	y: -310,
	width: 600,
	height: 620,
	padLeft: '0%',
	padRight: '0%',
	padTop: '0%',
	padBottom: '0%',
} as const;

const COIN_PAW_VIEWPORT_ANIMS = {
	appear: COIN_PAW_SPINE_VIEWPORT,
	appear_flash: COIN_PAW_SPINE_VIEWPORT,
	flash: COIN_PAW_SPINE_VIEWPORT,
	main_coin_fast: COIN_PAW_SPINE_VIEWPORT,
	main_coin_slow: COIN_PAW_SPINE_VIEWPORT,
} as const;

export const resolveCoinPawSpineUrl = (file: string) =>
	new URL(`assets/spines/symbols/coins/${file}`.replace(/^\//, ''), window.location.href).href;

export const COIN_PAW_SPINE_FILES = ['coins.json', 'coins.atlas', 'coins.webp'] as const;

export const COIN_PAW_SPINE_ASSET_URLS = COIN_PAW_SPINE_FILES.map(resolveCoinPawSpineUrl);

export const COIN_PAW_SPINE_WEBP_URL = resolveCoinPawSpineUrl('coins.webp');

let coinPawSpinePreloadStarted = false;

export const startCoinPawSpinePreload = () => {
	if (coinPawSpinePreloadStarted || typeof window === 'undefined') return;
	coinPawSpinePreloadStarted = true;

	const queue = [...COIN_PAW_SPINE_ASSET_URLS];
	const workerCount = Math.min(3, queue.length);

	void Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (queue.length > 0) {
				const url = queue.shift();
				if (!url) break;
				try {
					await fetch(url);
				} catch {
					/* Best-effort — SpinePlayer will retry on subscribe. */
				}
			}
		}),
	).then(() => {
		ensureRuntime('bronze', 'row');
		ensureRuntime('silver', 'row');
		ensureRuntime('gold', 'row');
	});
};

export type CoinPawSpineTarget = {
	canvas: HTMLCanvasElement;
	skin: CoinPawSkin;
	getSpeed: () => number;
	mode?: CoinPawSpineMode;
};

type RuntimeKey = `${CoinPawSkin}:${CoinPawSpineMode}`;

type SkinRuntime = {
	player: SpinePlayer;
	ready: boolean;
	mode: CoinPawSpineMode;
	targets: Set<CoinPawSpineTarget>;
	clipReady: boolean;
};

const runtimes = new Map<RuntimeKey, SkinRuntime>();
const clipStartedAt = new WeakMap<CoinPawSpineTarget, number>();
/** Last `appear_flash` / `flash` frame already on the 2D canvas — skip GPU. */
const frozenTargets = new WeakSet<CoinPawSpineTarget>();
let hubRoot: HTMLDivElement | null = null;
let hubCss = false;

const runtimeKey = (skin: CoinPawSkin, mode: CoinPawSpineMode): RuntimeKey => `${skin}:${mode}`;

const ensureHubCss = () => {
	if (hubCss || typeof document === 'undefined') return;
	hubCss = true;
	const style = document.createElement('style');
	style.textContent = `
		.coin-paw-spine-hub .spine-player { width:100%; height:100%; background:none !important; }
		.coin-paw-spine-hub .spine-player-canvas { display:block; width:100% !important; height:100% !important; background:transparent !important; }
		.coin-paw-spine-hub .spine-player-controls,
		.coin-paw-spine-hub .spine-player-error,
		.coin-paw-spine-hub .spine-player-loading { display:none !important; }
	`;
	document.head.appendChild(style);
};

const ensureHubRoot = () => {
	if (hubRoot) return hubRoot;
	ensureHubCss();
	hubRoot = document.createElement('div');
	hubRoot.className = 'coin-paw-spine-hub';
	hubRoot.setAttribute('aria-hidden', 'true');
	hubRoot.style.cssText =
		'position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;z-index:0';
	document.body.appendChild(hubRoot);
	return hubRoot;
};

const blitOne = (runtime: SkinRuntime, target: CoinPawSpineTarget): boolean => {
	const source = runtime.player.canvas;
	if (!source || source.width < 1 || source.height < 1) return false;
	const el = target.canvas;
	const w = COIN_PAW_SOURCE_SIZE;
	const h = COIN_PAW_SOURCE_SIZE;
	if (el.width !== w) el.width = w;
	if (el.height !== h) el.height = h;
	const ctx = el.getContext('2d');
	if (!ctx) return false;
	drawCoinPawLive(
		ctx,
		source,
		source.width,
		source.height,
		w,
		h,
		runtime.mode === 'flash' ? 'full' : 'disc',
	);
	return true;
};

const hasUnfrozenTargets = (runtime: SkinRuntime) => {
	for (const target of runtime.targets) {
		if (!frozenTargets.has(target)) return true;
	}
	return false;
};

/** One WebGL player per skin. Each overlay coin seeks its own appear_flash time. */
const poseAndBlitAll = (runtime: SkinRuntime) => {
	const player = runtime.player;
	const skeleton = player.skeleton;
	const state = player.animationState;
	const renderer = player.sceneRenderer;
	const gl = player.context?.gl;
	const source = player.canvas;
	if (!skeleton || !state || !renderer || !gl || !source || runtime.targets.size === 0) return;
	if (isHtmlWebglPaused()) return;
	const entry = state.getCurrent(0);
	if (!entry) return;

	const now = performance.now();
	const end = entry.animationEnd;
	const bg = player.bg;
	const pma = false;
	// Coin skeleton has no physics / IK — `none` skips the constraint pass.
	const physics = Physics.none;

	for (const target of runtime.targets) {
		if (frozenTargets.has(target)) continue;
		const started = clipStartedAt.get(target);
		if (started == null) continue;
		const trackTime = Math.min(end, Math.max(0, ((now - started) / 1000) * target.getSpeed()));
		entry.trackTime = trackTime;
		state.apply(skeleton);
		skeleton.updateWorldTransform(physics);
		gl.clearColor(bg.r, bg.g, bg.b, bg.a);
		gl.clear(gl.COLOR_BUFFER_BIT);
		renderer.begin();
		renderer.drawSkeleton(skeleton, pma);
		renderer.end();
		if (!blitOne(runtime, target)) continue;
		// Last pose is the reverse face (x1 / x2 / x3). Hold it on the 2D
		// canvas — fly is CSS from here, no more WebGL readback.
		if (trackTime >= end) frozenTargets.add(target);
	}
};

const ensureClip = (runtime: SkinRuntime) => {
	if (runtime.clipReady) return;
	const { player } = runtime;
	const clip = runtime.mode === 'flash' ? COIN_PAW_FLASH_CLIP : COIN_PAW_APPEAR_CLIP;
	player.paused = true;
	const skeleton = player.skeleton;
	const state = player.animationState;
	if (skeleton && state) {
		state.clearTracks();
		skeleton.setToSetupPose();
		const entry = state.setAnimation(0, clip, false);
		if (entry) {
			entry.trackTime = 0;
			entry.timeScale = 0;
			entry.mixDuration = 0;
		}
		state.apply(skeleton);
	} else {
		player.setAnimation(clip, false);
	}
	runtime.clipReady = true;
};

const ensureRuntime = (skin: CoinPawSkin, mode: CoinPawSpineMode): SkinRuntime => {
	const key = runtimeKey(skin, mode);
	const existing = runtimes.get(key);
	if (existing) return existing;

	const host = document.createElement('div');
	host.style.cssText = `width:${COIN_PAW_SOURCE_SIZE}px;height:${COIN_PAW_SOURCE_SIZE}px;`;
	ensureHubRoot().appendChild(host);

	const runtime: SkinRuntime = {
		player: null as unknown as SpinePlayer,
		ready: false,
		mode,
		targets: new Set(),
		clipReady: false,
	};

	const startClip = mode === 'flash' ? COIN_PAW_FLASH_CLIP : COIN_PAW_APPEAR_CLIP;

	const player = new SpinePlayer(host, {
		jsonUrl: resolveCoinPawSpineUrl('coins.json'),
		atlasUrl: resolveCoinPawSpineUrl('coins.atlas'),
		showControls: false,
		showLoading: false,
		backgroundColor: '#00000000',
		premultipliedAlpha: false,
		preserveDrawingBuffer: true,
		alpha: true,
		defaultMix: 0,
		skin: COIN_PAW_SPINE_SKIN[skin],
		animation: startClip,
		viewport: {
			...COIN_PAW_SPINE_VIEWPORT,
			animations: COIN_PAW_VIEWPORT_ANIMS,
		},
		success: (spinePlayer) => {
			runtime.player = spinePlayer;
			spinePlayer.paused = true;
			spinePlayer.skeleton!.scaleY = -1;
			const state = spinePlayer.animationState;
			const skeleton = spinePlayer.skeleton;
			if (state && skeleton) {
				state.clearTracks();
				skeleton.setToSetupPose();
			}
			runtime.ready = true;
			if (runtime.targets.size > 0) {
				ensureClip(runtime);
				const now = performance.now();
				for (const target of runtime.targets) {
					if (!clipStartedAt.has(target)) clipStartedAt.set(target, now);
				}
			}
		},
		draw: () => {
			if (isHtmlWebglPaused()) return;
			if (!hasUnfrozenTargets(runtime)) return;
			poseAndBlitAll(runtime);
		},
	});

	runtime.player = player;
	runtimes.set(key, runtime);
	return runtime;
};

/** Play `appear_flash` per coin (own clock), then hold the reverse (x1 / x2 / x3). */
export const subscribeCoinPawSpine = (target: CoinPawSpineTarget) => {
	startCoinPawSpinePreload();
	const mode = target.mode ?? 'row';
	const runtime = ensureRuntime(target.skin, mode);
	runtime.targets.add(target);
	frozenTargets.delete(target);
	if (runtime.ready) {
		ensureClip(runtime);
		clipStartedAt.set(target, performance.now());
	}
	return () => {
		runtime.targets.delete(target);
		frozenTargets.delete(target);
		if (runtime.targets.size === 0) {
			runtime.player.paused = true;
			runtime.clipReady = false;
		}
	};
};
