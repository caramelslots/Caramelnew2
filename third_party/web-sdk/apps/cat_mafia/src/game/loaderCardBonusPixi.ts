/**
 * Spine B on the Free Spins loader card — same recipe as the reel slot:
 * one Spine, designer clip on the cat, `frame`/`frame2` after the clip end
 * (BonusUnclipFrame), scale + BONUS_OFFSET from constants.ts.
 *
 * Portrait `background` is drawn *before* the clip and stretched down so it
 * fills the gold-frame cutouts (on the board those show parchment).
 *
 * Canvas is a child of the card host so carousel translateX moves with it.
 */
import * as PIXI from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';

import assets from './assets';
import { pickBonusIdleClip } from './constants';
import { isHtmlWebglPaused } from './htmlWebglPause';

export type LoaderCardBonusViewId = number;

type View = {
	id: LoaderCardBonusViewId;
	host: HTMLElement;
	playing: boolean;
};

const CANVAS_CLASS = 'loader-card-bonus-spine-canvas';
const FRAME_SLOT_NAMES = new Set(['frame', 'frame2']);
const BACK_SLOT_NAMES = new Set(['background', 'background2']);
/** Grow portrait fill downward into the BONUS-bar flourish cutouts. */
const BACK_HEIGHT_SCALE = 1.18;
const BACK_SETUP_HEIGHT = 1170;

/** Same AABB / art span as `constants.ts` Bonus (B). */
const BONUS_SKELETON = {
	x: -1954.2445,
	y: -510.1582,
	width: 3689.5376,
	height: 3551.369,
} as const;
const BONUS_ART_SPAN = 1225 * 1.55057;

const views = new Map<LoaderCardBonusViewId, View>();

let app: PIXI.Application | undefined;
let appReady: Promise<PIXI.Application | undefined> | undefined;
let appGen = 0;
let spine: Spine | undefined;
let spineReady: Promise<Spine | null> | undefined;
let spineLoading = false;
let nextViewId = 1;
let tickerBound = false;
let hostObserver: ResizeObserver | undefined;
let resizeListening = false;

const bonusSpineSrc = () => {
	const src = assets.B.src;
	if (typeof src === 'string') throw new Error('loaderCardBonusPixi: B is not a spine asset');
	return src;
};

const hostDpr = () => Math.min(window.devicePixelRatio || 1, 2);

const hostBox = (el: HTMLElement) => ({
	w: Math.max(0, Math.round(el.clientWidth)),
	h: Math.max(0, Math.round(el.clientHeight)),
});

const isPreparing = (el: HTMLElement) => Boolean(el.closest('[data-loader-cards-prepare]'));

const isDisplayed = (el: HTMLElement) => {
	if (!el.isConnected) return false;
	const { w, h } = hostBox(el);
	if (w < 2 || h < 2) return false;
	const preparing = isPreparing(el);
	let node: HTMLElement | null = el;
	while (node) {
		const style = getComputedStyle(node);
		if (style.display === 'none') return false;
		if (style.visibility === 'hidden' && !preparing) return false;
		// Preparing overlay stays opacity:0 so cards+icon reveal together.
		if (!preparing && Number.parseFloat(style.opacity) === 0) return false;
		node = node.parentElement;
	}
	return true;
};

const intersects = (a: DOMRect, b: DOMRect) =>
	a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;

const isCardInView = (host: HTMLElement) => {
	if (!isDisplayed(host)) return false;
	// During the opacity:0 prepare pass, force a layout even if the Free Spins
	// card sits off the carousel viewport.
	if (isPreparing(host)) return true;
	const card = host.closest('.loader-card');
	const viewport = host.closest('.carousel-viewport');
	if (!(viewport instanceof HTMLElement)) return true;
	const target = card instanceof HTMLElement ? card : host;
	return intersects(target.getBoundingClientRect(), viewport.getBoundingClientRect());
};

/**
 * Unclip the portrait fill (before `mask`), keep the cat inside the designer
 * clip, draw gold rails / BONUS after the clip end — same idea as
 * `BonusUnclipFrame.svelte`.
 */
const orderBonusSlots = (target: Spine) => {
	const order = target.skeleton.drawOrder;
	const backs: typeof order = [];
	const frames: typeof order = [];
	const others: typeof order = [];
	for (let i = 0; i < order.length; i++) {
		const slot = order[i];
		const name = slot.data.name;
		if (BACK_SLOT_NAMES.has(name)) backs.push(slot);
		else if (FRAME_SLOT_NAMES.has(name)) frames.push(slot);
		else others.push(slot);
	}
	let i = 0;
	for (let n = 0; n < backs.length; n++) order[i++] = backs[n];
	for (let n = 0; n < others.length; n++) order[i++] = others[n];
	for (let n = 0; n < frames.length; n++) order[i++] = frames[n];
};

/** Outer glow square — reads as a second frame on the parchment card. */
const hideOuterGlow = (target: Spine) => {
	const slot = target.skeleton.findSlot('frame_000');
	if (slot) slot.setAttachment(null);
};

/** Stretch `background` down only — top edge stays, extra covers the cutouts. */
const extendMascotBackground = (target: Spine) => {
	const bone = target.skeleton.findBone('background');
	if (!bone) return;
	const extra = (BACK_HEIGHT_SCALE - 1) * BACK_SETUP_HEIGHT;
	bone.scaleY = bone.data.scaleY * BACK_HEIGHT_SCALE;
	bone.y = bone.data.y - extra * 0.5;
};

const prepareSlotDraw = (target: Spine) => {
	hideOuterGlow(target);
	extendMascotBackground(target);
	orderBonusSlots(target);
};

const bindIdleCycle = (target: Spine) => {
	target.state.addListener({
		complete: (entry) => {
			const name = entry.animation?.name;
			if (name === 'idle_blink' || name === 'idle_ears') {
				target.state.setAnimation(0, 'idle', true);
				return;
			}
			if (name !== 'idle') return;
			const next = pickBonusIdleClip();
			if (next === 'idle') return;
			target.state.setAnimation(0, next, false);
		},
	});
};

/** Slot math: gold frame fills `targetArt`; AABB centred with BONUS_OFFSET. */
const layoutLikeSlot = (target: Spine, boxWidth: number, boxHeight: number) => {
	const pad = 0.02;
	const targetArt = Math.min(boxWidth, boxHeight) * (1 - pad * 2);
	const scale = targetArt / BONUS_ART_SPAN;
	const offsetX = -(BONUS_SKELETON.x + BONUS_SKELETON.width * 0.5) * scale;
	const offsetY = (BONUS_SKELETON.y + BONUS_SKELETON.height * 0.5) * scale;
	target.scale.set(scale);
	target.x = boxWidth * 0.5 + offsetX;
	target.y = boxHeight * 0.5 + offsetY;
	target.visible = true;
};

const ensureApp = () => {
	if (app) return Promise.resolve(app);
	if (appReady) return appReady;

	const gen = appGen;
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
		if (gen !== appGen) {
			next.destroy(true);
			return undefined;
		}
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
			next.ticker.add(syncStage);
			tickerBound = true;
		}
		return next;
	})();

	return appReady;
};

const loadSpine = () => {
	if (spine) return Promise.resolve(spine);
	if (spineReady) return spineReady;

	spineLoading = true;
	const gen = appGen;
	spineReady = (async () => {
		await ensureApp();
		if (gen !== appGen) return null;
		const urls = bonusSpineSrc();
		await PIXI.Assets.load([urls.atlas, urls.skeleton]);
		if (gen !== appGen || !app) return null;
		if (views.size === 0) return null;
		if (spine) return spine;
		const created = Spine.from({
			skeleton: urls.skeleton,
			atlas: urls.atlas,
			autoUpdate: false,
		});
		created.state.setAnimation(0, 'idle', true);
		bindIdleCycle(created);
		const previousBefore = created.beforeUpdateWorldTransforms;
		created.beforeUpdateWorldTransforms = () => {
			previousBefore?.(created);
			prepareSlotDraw(created);
		};
		created.update(0);
		prepareSlotDraw(created);
		created.visible = false;
		app.stage.addChild(created);
		spine = created;
		return created;
	})().finally(() => {
		spineLoading = false;
		if (!spine) spineReady = undefined;
		if (views.size === 0 && !spine) destroyIfIdle();
	});

	return spineReady;
};

export const whenLoaderCardBonusReady = async () => {
	if (views.size === 0) {
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	}
	if (views.size === 0) return null;
	return loadSpine();
};

export const isLoaderCardBonusReady = () => Boolean(spine);

/** Force one layout/render pass (e.g. while the overlay is still opacity:0). */
export const flushLoaderCardBonusStage = () => {
	requestSync();
};

const attachCanvas = (host: HTMLElement) => {
	if (!app) return;
	if (app.canvas.parentElement === host) return;
	host.appendChild(app.canvas);
	if (!hostObserver) {
		hostObserver = new ResizeObserver(() => requestSync());
	}
	hostObserver.disconnect();
	hostObserver.observe(host);
	if (!resizeListening) {
		window.addEventListener('resize', requestSync);
		resizeListening = true;
	}
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
	app.canvas.style.width = '100%';
	app.canvas.style.height = '100%';
};

const layoutSpine = (target: Spine, host: HTMLElement) => {
	const { w, h } = hostBox(host);
	if (w < 2 || h < 2) {
		target.visible = false;
		return;
	}
	layoutLikeSlot(target, w, h);
};

const pickVisibleView = () => {
	for (const view of views.values()) {
		if (isCardInView(view.host)) return view;
	}
	return null;
};

const syncStage = () => {
	if (!app) return;

	const view = pickVisibleView();
	const target = spine;
	const wantsPlay =
		[...views.values()].some((item) => item.playing) && !isHtmlWebglPaused();

	if (!view || !target) {
		if (target) target.visible = false;
		if (!wantsPlay) app.ticker.stop();
		return;
	}

	attachCanvas(view.host);
	resizeCanvas(view.host);
	if (wantsPlay && view.playing) target.update(app.ticker.deltaTime / 60);
	prepareSlotDraw(target);
	layoutSpine(target, view.host);
	app.render();

	if (!wantsPlay && app.ticker.started) app.ticker.stop();
};

const requestSync = () => {
	if (!app) return;
	if (!app.ticker.started) app.ticker.start();
	syncStage();
};

const destroyIfIdle = () => {
	if (views.size > 0 || spineLoading) return;
	appGen += 1;
	const current = app;
	const currentSpine = spine;
	app = undefined;
	appReady = undefined;
	spine = undefined;
	spineReady = undefined;
	tickerBound = false;
	currentSpine?.destroy({ children: true });
	hostObserver?.disconnect();
	hostObserver = undefined;
	if (resizeListening) {
		window.removeEventListener('resize', requestSync);
		resizeListening = false;
	}
	if (current) current.destroy(true);
};

/** Tear down overlay WebGL after Continue / unmount. Does not unload slot atlas B. */
export const destroyLoaderCardBonusPixi = () => {
	views.clear();
	spineLoading = false;
	destroyIfIdle();
};

export const registerLoaderCardBonusSpine = (
	host: HTMLElement,
	playing: boolean,
): LoaderCardBonusViewId => {
	const id = nextViewId;
	nextViewId += 1;
	views.set(id, { id, host, playing });
	void ensureApp().then(() => {
		if (!views.has(id)) return;
		void loadSpine().then((created) => {
			if (!views.has(id) || !created) return;
			host.dataset.ready = 'true';
			requestSync();
		});
	});
	return id;
};

export const setLoaderCardBonusSpinePlaying = (id: LoaderCardBonusViewId, playing: boolean) => {
	const view = views.get(id);
	if (!view || view.playing === playing) return;
	view.playing = playing;
	requestSync();
};

export const unregisterLoaderCardBonusSpine = (id: LoaderCardBonusViewId) => {
	const view = views.get(id);
	if (view) delete view.host.dataset.ready;
	views.delete(id);
	if (views.size === 0) {
		destroyIfIdle();
		return;
	}
	requestSync();
};
