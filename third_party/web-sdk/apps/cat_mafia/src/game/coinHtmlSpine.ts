/** Designer coin Spine — live playback of every clip from `coins_3x3`. */

import { SpinePlayer } from '@esotericsoftware/spine-player';

import {
	COIN_PAW_SOURCE_SIZE,
	coinPawSkinForTier,
	drawCoinPawLive,
	type CoinPawSkin,
} from './coinSpriteSheet';

export { coinPawSkinForTier };

export const COIN_PAW_SPINE_SKIN: Record<CoinPawSkin, string> = {
	bronze: 'coin_bronze',
	silver: 'coin_silver',
	gold: 'coin_gold',
};

export const COIN_PAW_APPEAR_CLIP = 'appear_flash';
export const COIN_PAW_FLASH_CLIP = 'flash';

export type CoinPawSpineMode = 'row' | 'flash';

/** Same window as `scripts/bake-coins.html` so cell crop stays aligned. */
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
	new URL(`assets/spines/coins/${file}`.replace(/^\//, ''), window.location.href).href;

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
	replayQueued: boolean;
};

const runtimes = new Map<RuntimeKey, SkinRuntime>();
let hubRoot: HTMLDivElement | null = null;
let hubCss = false;

const runtimeKey = (skin: CoinPawSkin, mode: CoinPawSpineMode): RuntimeKey =>
	`${skin}:${mode}`;

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

const fitAndBlit = (runtime: SkinRuntime) => {
	const source = runtime.player.canvas;
	if (!source || source.width < 1 || source.height < 1) return;
	const fit = runtime.mode === 'flash' ? 'full' : 'disc';
	for (const target of runtime.targets) {
		const el = target.canvas;
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const cssW = Math.max(1, el.clientWidth);
		const cssH = Math.max(1, el.clientHeight);
		const w = Math.round(cssW * dpr);
		const h = Math.round(cssH * dpr);
		if (el.width !== w) el.width = w;
		if (el.height !== h) el.height = h;
		const ctx = el.getContext('2d');
		if (!ctx) continue;
		drawCoinPawLive(ctx, source, source.width, source.height, w, h, fit);
	}
};

const playClip = (
	runtime: SkinRuntime,
	clip: string,
	loop: boolean,
	resetPose: boolean,
) => {
	const { player } = runtime;
	const speed = [...runtime.targets][0]?.getSpeed() ?? 1;
	player.speed = speed;
	player.paused = false;
	const skeleton = player.skeleton;
	const state = player.animationState;
	if (skeleton && state) {
		state.timeScale = 1;
		if (resetPose) {
			state.clearTracks();
			skeleton.setToSetupPose();
		}
		const entry = state.setAnimation(0, clip, loop);
		if (entry) {
			entry.trackTime = 0;
			entry.timeScale = 1;
			entry.mixDuration = 0;
		}
		state.apply(skeleton);
		return;
	}
	player.setAnimation(clip, loop);
};

const holdCurrentEnd = (player: SpinePlayer) => {
	const entry = player.animationState?.getCurrent(0);
	if (!entry) {
		player.paused = true;
		return;
	}
	entry.trackTime = entry.animationEnd;
	entry.timeScale = 0;
	player.paused = true;
};

const replayRow = (runtime: SkinRuntime) => {
	playClip(runtime, COIN_PAW_APPEAR_CLIP, false, true);
};

const replayFlash = (runtime: SkinRuntime) => {
	playClip(runtime, COIN_PAW_FLASH_CLIP, false, true);
};

const waitForDrawReady = (runtime: SkinRuntime) =>
	new Promise<void>((resolve) => {
		let frames = 0;
		const tick = () => {
			const source = runtime.player.canvas;
			const target = runtime.targets.values().next().value as CoinPawSpineTarget | undefined;
			const sourceOk = !!source && source.width > 8 && source.height > 8;
			const targetOk = !!target && target.canvas.clientWidth > 8 && target.canvas.clientHeight > 8;
			if ((sourceOk && targetOk) || frames >= 45) {
				resolve();
				return;
			}
			frames += 1;
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});

const scheduleReplay = (runtime: SkinRuntime) => {
	if (runtime.replayQueued) return;
	runtime.replayQueued = true;
	void waitForDrawReady(runtime).then(() => {
		runtime.replayQueued = false;
		if (!runtime.ready || runtime.targets.size === 0) return;
		if (runtime.mode === 'flash') replayFlash(runtime);
		else replayRow(runtime);
	});
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
		replayQueued: false,
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
			state?.addListener({
				complete: (entry) => {
					const name = entry.animation?.name;
					if (mode === 'row' && name === COIN_PAW_APPEAR_CLIP) {
						holdCurrentEnd(spinePlayer);
					} else if (name === COIN_PAW_FLASH_CLIP) {
						holdCurrentEnd(spinePlayer);
					}
				},
			});
			runtime.ready = true;
			if (runtime.targets.size > 0) scheduleReplay(runtime);
		},
		draw: (spinePlayer) => {
			const first = runtime.targets.values().next().value as CoinPawSpineTarget | undefined;
			if (first) spinePlayer.speed = first.getSpeed();
			if (runtime.targets.size > 0) fitAndBlit(runtime);
		},
	});

	runtime.player = player;
	runtimes.set(key, runtime);
	return runtime;
};

/** Play `appear_flash`, then hold the reverse (x1 / x2 / x3). */
export const subscribeCoinPawSpine = (target: CoinPawSpineTarget) => {
	startCoinPawSpinePreload();
	const mode = target.mode ?? 'row';
	const runtime = ensureRuntime(target.skin, mode);
	runtime.targets.add(target);
	if (runtime.ready) scheduleReplay(runtime);
	return () => {
		runtime.targets.delete(target);
		if (runtime.targets.size === 0) {
			runtime.player.paused = true;
		}
	};
};
