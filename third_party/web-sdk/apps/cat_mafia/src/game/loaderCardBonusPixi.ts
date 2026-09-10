/**
 * Loader card 1 — Bonus (B) symbol via Pixi canvas mounted inside the card host.
 * Canvas is a DOM child of the card slot so carousel CSS transforms move it in sync.
 */
import * as PIXI from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';

import assets from './assets';
import { pickBonusIdleClip, type BonusIdleClip } from './constants';
import { isHtmlWebglPaused } from './htmlWebglPause';

const BONUS_SKELETON_X = -1954.2445;
const BONUS_SKELETON_Y = -510.1582;
const BONUS_SKELETON_WIDTH = 3689.5376;
const BONUS_SKELETON_HEIGHT = 3551.369;
const BONUS_FRAME_SPAN = 1900;

const LOADER_CARD_BONUS_VIEWPORT = {
	x: BONUS_SKELETON_X + BONUS_SKELETON_WIDTH / 2 - BONUS_FRAME_SPAN / 2,
	y: BONUS_SKELETON_Y + BONUS_SKELETON_HEIGHT / 2 - BONUS_FRAME_SPAN / 2,
	width: BONUS_FRAME_SPAN,
	height: BONUS_FRAME_SPAN,
} as const;

const CANVAS_CLASS = 'loader-card-bonus-pixi-canvas';

export type LoaderCardBonusViewId = number;

type CardView = {
	id: LoaderCardBonusViewId;
	host: HTMLElement;
	active: boolean;
};

const views = new Map<LoaderCardBonusViewId, CardView>();

let app: PIXI.Application | undefined;
let appReady: Promise<PIXI.Application> | undefined;
let spine: Spine | undefined;
let spineLoading: Promise<Spine | null> | undefined;
let nextViewId = 1;
let tickerBound = false;
let hostObserver: ResizeObserver | undefined;
let observedHost: HTMLElement | undefined;
let idleListenerBound = false;

const bonusAssetUrls = () => {
	const src = assets.B.src;
	return { atlas: src.atlas, skeleton: src.skeleton };
};

const hostDpr = () => Math.min(window.devicePixelRatio || 1, 2);

const hostBox = (el: HTMLElement) => ({
	w: Math.max(0, Math.round(el.clientWidth)),
	h: Math.max(0, Math.round(el.clientHeight)),
});

const isDisplayed = (el: HTMLElement) => {
	if (!el.isConnected) return false;
	const { w, h } = hostBox(el);
	if (w < 2 || h < 2) return false;
	let node: HTMLElement | null = el;
	while (node) {
		const style = getComputedStyle(node);
		if (style.display === 'none' || style.visibility === 'hidden') return false;
		// Skip opacity — desktop `.loader-card.animate-in` fades 0→1; a one-frame
		// false here used to stop the ticker and never recover after the CSS anim.
		node = node.parentElement;
	}
	return true;
};

/** Fit the bonus viewport into a Pixi host (skeleton Y-up → Pixi Y-down). */
const getLoaderCardBonusPixiTransform = (boxWidth: number, boxHeight: number) => {
	const vp = LOADER_CARD_BONUS_VIEWPORT;
	const pad = 0.02;
	const width = vp.width * (1 + pad * 2);
	const height = vp.height * (1 + pad * 2);
	const scale = Math.min(boxWidth / width, boxHeight / height);
	const cx = vp.x + vp.width * 0.5;
	const cy = vp.y + vp.height * 0.5;
	return {
		scale,
		spineX: -cx * scale,
		spineY: cy * scale,
	};
};

const playBonusClip = (target: Spine, clip: BonusIdleClip, loop: boolean) => {
	target.state.setAnimation(0, clip, loop);
};

const bindBonusIdleCycle = (target: Spine) => {
	if (idleListenerBound) return;
	idleListenerBound = true;
	target.state.addListener({
		complete: (entry) => {
			const name = entry.animation?.name;
			if (name === 'idle_blink' || name === 'idle_ears') {
				playBonusClip(target, 'idle', true);
				return;
			}
			if (name !== 'idle') return;
			const next = pickBonusIdleClip();
			if (next === 'idle') return;
			playBonusClip(target, next, false);
		},
	});
	playBonusClip(target, 'idle', true);
};

const ensureApp = () => {
	if (app) return Promise.resolve(app);
	if (appReady) return appReady;

	appReady = (async () => {
		const next = new PIXI.Application();
		await next.init({
			width: 4,
			height: 4,
			backgroundAlpha: 0,
			antialias: true,
			autoDensity: true,
			preference: 'webgl',
			powerPreference: 'high-performance',
			resolution: hostDpr(),
			autoStart: false,
		});
		next.canvas.className = CANVAS_CLASS;
		next.canvas.style.position = 'absolute';
		next.canvas.style.inset = '0';
		next.canvas.style.width = '100%';
		next.canvas.style.height = '100%';
		next.canvas.style.pointerEvents = 'none';
		next.canvas.setAttribute('aria-hidden', 'true');
		app = next;
		if (!tickerBound) {
			next.ticker.maxFPS = 30;
			next.ticker.add(syncSharedStage);
			tickerBound = true;
		}
		return next;
	})();

	return appReady;
};

const loadSpine = () => {
	if (spine) return Promise.resolve(spine);
	if (spineLoading) return spineLoading;

	spineLoading = (async () => {
		await ensureApp();
		if (!app) return null;
		const urls = bonusAssetUrls();
		await PIXI.Assets.load([urls.atlas, urls.skeleton]);
		if (!app) return null;
		const created = Spine.from({
			skeleton: urls.skeleton,
			atlas: urls.atlas,
			autoUpdate: false,
		});
		bindBonusIdleCycle(created);
		created.update(0);
		created.visible = false;
		app.stage.addChild(created);
		spine = created;
		return created;
	})().finally(() => {
		spineLoading = undefined;
	});

	return spineLoading;
};

const observeHost = (host: HTMLElement) => {
	if (observedHost === host) return;
	if (!hostObserver) {
		hostObserver = new ResizeObserver(() => requestSync());
	}
	hostObserver.disconnect();
	hostObserver.observe(host);
	observedHost = host;
};

const attachCanvas = (host: HTMLElement) => {
	if (!app) return;
	if (app.canvas.parentElement !== host) {
		host.appendChild(app.canvas);
	}
	observeHost(host);
};

const resizeCanvas = (host: HTMLElement) => {
	if (!app) return;
	const { w, h } = hostBox(host);
	if (w < 2 || h < 2) return;
	const dpr = hostDpr();
	if (app.renderer.resolution !== dpr) app.renderer.resolution = dpr;
	if (app.renderer.width !== w || app.renderer.height !== h) {
		app.renderer.resize(w, h);
	}
};

/** Local stage coords — canvas moves with the card DOM subtree. */
const layoutSpine = (target: Spine, host: HTMLElement) => {
	const { w, h } = hostBox(host);
	if (w < 2 || h < 2) {
		target.visible = false;
		return;
	}
	const transform = getLoaderCardBonusPixiTransform(w, h);
	target.visible = true;
	target.scale.set(transform.scale);
	target.x = w * 0.5 + transform.spineX;
	target.y = h * 0.5 + transform.spineY;
};

const pickView = () => {
	for (const view of views.values()) {
		if (isDisplayed(view.host)) return view;
	}
	return undefined;
};

const syncSharedStage = () => {
	if (!app || !spine) return;

	if (views.size === 0) {
		spine.visible = false;
		app.ticker.stop();
		return;
	}

	const view = pickView();
	if (!view) {
		spine.visible = false;
		app.render();
		return;
	}

	attachCanvas(view.host);
	resizeCanvas(view.host);
	layoutSpine(spine, view.host);

	const animating = view.active && !isHtmlWebglPaused();
	if (animating) spine.update(app.ticker.deltaTime / 60);

	app.render();
};

const requestSync = () => {
	if (!app || views.size === 0) return;
	if (!app.ticker.started) app.ticker.start();
	syncSharedStage();
};

const destroyIfIdle = () => {
	if (views.size > 0 || spineLoading) return;
	const current = app;
	app = undefined;
	appReady = undefined;
	tickerBound = false;
	idleListenerBound = false;
	spine?.destroy({ children: true });
	spine = undefined;
	hostObserver?.disconnect();
	hostObserver = undefined;
	observedHost = undefined;
	if (current) current.destroy(true);
};

/** HTTP warm-up — textures must load into the overlay renderer on first open. */
export const preloadLoaderCardBonusPixi = async () => {
	if (typeof window === 'undefined') return;
	const urls = bonusAssetUrls();
	await Promise.all([urls.atlas, urls.skeleton].map((url) => fetch(url).catch(() => null)));
};

/** Create the overlay Pixi app + Bonus spine before loader cards appear. */
export const warmLoaderCardBonusPixi = () => {
	if (typeof window === 'undefined') return Promise.resolve();
	return ensureApp().then(() => loadSpine()).then(() => undefined);
};

export const registerLoaderCardBonusView = (
	host: HTMLElement,
	active: boolean,
): LoaderCardBonusViewId => {
	const id = nextViewId;
	nextViewId += 1;
	views.set(id, { id, host, active });
	void ensureApp().then(() => {
		if (!views.has(id)) return;
		requestSync();
		void loadSpine().then(() => {
			if (views.has(id)) requestSync();
		});
	});
	// Desktop cards fade in (opacity 0→1) — re-sync once the host has layout.
	requestAnimationFrame(() => requestSync());
	return id;
};

export const setLoaderCardBonusViewActive = (id: LoaderCardBonusViewId, active: boolean) => {
	const view = views.get(id);
	if (!view || view.active === active) return;
	view.active = active;
	requestSync();
};

export const unregisterLoaderCardBonusView = (id: LoaderCardBonusViewId) => {
	views.delete(id);
	if (views.size === 0) {
		destroyIfIdle();
		return;
	}
	requestSync();
};
