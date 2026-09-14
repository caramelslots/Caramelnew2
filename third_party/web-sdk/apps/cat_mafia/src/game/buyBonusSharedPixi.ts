/**
 * One WebGL context for every buy-bonus card.
 * Menu + confirm register host boxes; each variant has a single Spine.
 * The context exists only while a card is visible — hidden menus must not
 * keep a second WebGL renderer alive (iOS Safari GPU).
 */
import * as PIXI from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';

import {
	BUY_BONUS_HIDDEN_SLOTS,
	BUY_BONUS_SPINE_ANIM,
	buyBonusSpineUrls,
	getBuyBonusPixiTransform,
	type BuyBonusSpineVariant,
} from './buyBonusHtmlSpine';
import { isHtmlWebglPaused } from './htmlWebglPause';

export type BuyBonusCardViewId = number;

type CardView = {
	id: BuyBonusCardViewId;
	variant: BuyBonusSpineVariant;
	host: HTMLElement;
	active: boolean;
};

const LAYER_SELECTOR = '[data-buy-bonus-spine-layer]';
const CANVAS_CLASS = 'buy-bonus-shared-spine-canvas';

const views = new Map<BuyBonusCardViewId, CardView>();
const spines = new Map<BuyBonusSpineVariant, Spine>();
const loading = new Map<BuyBonusSpineVariant, Promise<Spine | null>>();

let app: PIXI.Application | undefined;
let appReady: Promise<PIXI.Application | undefined> | undefined;
let appGen = 0;
let nextViewId = 1;
let tickerBound = false;
let layerObserver: ResizeObserver | undefined;
let resizeListening = false;
let destroyTimer: ReturnType<typeof setTimeout> | undefined;

const hostDpr = () => Math.min(window.devicePixelRatio || 1, 2);

const hostBox = (el: HTMLElement) => ({
	w: Math.max(0, Math.round(el.clientWidth)),
	h: Math.max(0, Math.round(el.clientHeight)),
});

const isPreparing = (el: HTMLElement) => Boolean(el.closest('[data-buy-bonus-prepare]'));

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
		// Preparing panel stays opacity:0 so bg+cards can reveal together.
		if (!preparing && Number.parseFloat(style.opacity) === 0) return false;
		node = node.parentElement;
	}
	return true;
};

const hasDisplayedView = () => {
	for (const view of views.values()) {
		if (isDisplayed(view.host)) return true;
	}
	return false;
};

/** Open menu/confirm hosts — keep GL even while the panel is still opacity:0. */
const hasLiveView = () => {
	for (const view of views.values()) {
		if (!view.host.isConnected) continue;
		if (view.active || isDisplayed(view.host)) return true;
	}
	return false;
};

const hideReferenceSlots = (spine: Spine, variant: BuyBonusSpineVariant) => {
	for (const name of BUY_BONUS_HIDDEN_SLOTS[variant]) {
		const slot = spine.skeleton.findSlot(name);
		if (!slot) continue;
		slot.setAttachment(null);
	}
};

const ensureApp = (): Promise<PIXI.Application | undefined> => {
	if (app) return Promise.resolve(app);
	if (appReady) return appReady;

	const gen = ++appGen;
	const pending = (async () => {
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
		if (gen !== appGen || views.size === 0) {
			next.destroy(true);
			return undefined;
		}
		next.canvas.className = CANVAS_CLASS;
		next.canvas.style.position = 'absolute';
		next.canvas.style.inset = '0';
		next.canvas.style.width = '100%';
		next.canvas.style.height = '100%';
		next.canvas.style.pointerEvents = 'none';
		next.canvas.style.zIndex = '0';
		next.canvas.setAttribute('aria-hidden', 'true');
		app = next;
		if (!tickerBound) {
			next.ticker.maxFPS = 30;
			next.ticker.add(syncSharedStage);
			tickerBound = true;
		}
		return next;
	})();

	appReady = pending.then((created) => {
		if (!created && appReady === pending) appReady = undefined;
		return created;
	});

	return appReady;
};

const MENU_VARIANTS: readonly BuyBonusSpineVariant[] = ['normal', 'super', 'duel'];

const loadSpine = (variant: BuyBonusSpineVariant) => {
	const existing = spines.get(variant);
	if (existing) return Promise.resolve(existing);
	const pending = loading.get(variant);
	if (pending) return pending;

	const task = (async () => {
		if (views.size === 0) return null;
		const createdApp = await ensureApp();
		if (!createdApp || views.size === 0) return null;
		const urls = buyBonusSpineUrls(variant);
		await PIXI.Assets.load([urls.atlas, urls.skeleton]);
		if (!app || views.size === 0) return null;
		const already = spines.get(variant);
		if (already) return already;
		const spine = Spine.from({
			skeleton: urls.skeleton,
			atlas: urls.atlas,
			autoUpdate: false,
		});
		spine.state.setAnimation(0, BUY_BONUS_SPINE_ANIM[variant], true);
		spine.update(0);
		hideReferenceSlots(spine, variant);
		spine.visible = false;
		app.stage.addChild(spine);
		spines.set(variant, spine);
		return spine;
	})().finally(() => {
		loading.delete(variant);
		if (!hasLiveView()) scheduleDestroyIfIdle();
	});

	loading.set(variant, task);
	return task;
};

export const whenBuyBonusSpinesReady = async (
	variants: readonly BuyBonusSpineVariant[] = MENU_VARIANTS,
) => {
	await Promise.all(variants.map((variant) => loadSpine(variant)));
};

export const areBuyBonusSpinesReady = (
	variants: readonly BuyBonusSpineVariant[] = MENU_VARIANTS,
) => variants.every((variant) => spines.has(variant));

/** Force one layout/render pass (e.g. while the menu is still opacity:0). */
export const flushBuyBonusSharedStage = () => {
	requestSync();
};

const attachCanvas = (layer: HTMLElement) => {
	if (!app) return;
	if (app.canvas.parentElement === layer) return;
	layer.appendChild(app.canvas);
	if (!layerObserver) {
		layerObserver = new ResizeObserver(() => requestSync());
	}
	layerObserver.disconnect();
	layerObserver.observe(layer);
	if (!resizeListening) {
		window.addEventListener('resize', requestSync);
		resizeListening = true;
	}
};

const resizeCanvas = (layer: HTMLElement) => {
	if (!app) return;
	const { w, h } = hostBox(layer);
	if (w < 2 || h < 2) return;
	const dpr = hostDpr();
	if (app.renderer.resolution !== dpr) app.renderer.resolution = dpr;
	if (app.renderer.width !== w || app.renderer.height !== h) {
		app.renderer.resize(w, h);
	}
	app.canvas.style.width = '100%';
	app.canvas.style.height = '100%';
};

const cardButton = (host: HTMLElement) => host.closest('button');

const layoutSpine = (spine: Spine, variant: BuyBonusSpineVariant, host: HTMLElement, layer: HTMLElement) => {
	const layerRect = layer.getBoundingClientRect();
	const hostRect = host.getBoundingClientRect();
	const w = hostRect.width;
	const h = hostRect.height;
	if (w < 2 || h < 2) {
		spine.visible = false;
		return;
	}
	const transform = getBuyBonusPixiTransform(variant, w, h);
	spine.visible = true;
	spine.scale.set(transform.scale);
	spine.x = hostRect.left - layerRect.left + w * 0.5 + transform.spineX;
	spine.y = hostRect.top - layerRect.top + h * 0.5 + transform.spineY;

	const button = cardButton(host);
	const disabled = Boolean(button?.disabled);
	const hovered = Boolean(button && !disabled && button.matches(':hover'));
	spine.alpha = disabled ? 0.5 : 1;
	spine.tint = hovered ? 0xfff2dc : 0xffffff;
};

const pickLayer = (visible: CardView[]) => {
	for (const view of visible) {
		if (!view.active) continue;
		const layer = view.host.closest(LAYER_SELECTOR);
		if (layer instanceof HTMLElement) return layer;
	}
	for (const view of visible) {
		const layer = view.host.closest(LAYER_SELECTOR);
		if (layer instanceof HTMLElement) return layer;
	}
	return null;
};

const syncSharedStage = () => {
	if (!app) return;

	const visible: CardView[] = [];
	for (const view of views.values()) {
		if (isDisplayed(view.host)) visible.push(view);
	}

	const layer = pickLayer(visible);
	if (!layer) {
		for (const spine of spines.values()) spine.visible = false;
		app.ticker.stop();
		scheduleDestroyIfIdle();
		return;
	}

	cancelScheduledDestroy();
	attachCanvas(layer);
	resizeCanvas(layer);

	const playing = visible.some((view) => view.active) && !isHtmlWebglPaused();
	const dt = playing ? app.ticker.deltaTime / 60 : 0;

	for (const variant of spines.keys()) {
		const spine = spines.get(variant);
		if (!spine) continue;
		const view = visible.find((item) => item.variant === variant && item.active) ??
			visible.find((item) => item.variant === variant);
		if (!view) {
			spine.visible = false;
			continue;
		}
		layoutSpine(spine, variant, view.host, layer);
		if (playing && view.active) spine.update(dt);
	}

	app.render();

	if (!playing && app.ticker.started) app.ticker.stop();
};

const requestSync = () => {
	if (!app) return;
	if (!app.ticker.started) app.ticker.start();
	syncSharedStage();
};

const cancelScheduledDestroy = () => {
	if (destroyTimer === undefined) return;
	clearTimeout(destroyTimer);
	destroyTimer = undefined;
};

/** Cover buyBonus → confirm remount so we do not thrash the context. */
const DESTROY_IDLE_MS = 80;

const scheduleDestroyIfIdle = () => {
	cancelScheduledDestroy();
	destroyTimer = setTimeout(() => {
		destroyTimer = undefined;
		destroyIfIdle();
	}, DESTROY_IDLE_MS);
};

const destroyIfIdle = () => {
	if (loading.size > 0 || hasLiveView()) return;
	cancelScheduledDestroy();
	appGen += 1;
	for (const spine of spines.values()) {
		try {
			spine.destroy({ children: true });
		} catch {
			/* already released */
		}
	}
	spines.clear();
	const current = app;
	app = undefined;
	appReady = undefined;
	tickerBound = false;
	layerObserver?.disconnect();
	layerObserver = undefined;
	if (resizeListening) {
		window.removeEventListener('resize', requestSync);
		resizeListening = false;
	}
	if (current) {
		current.ticker.remove(syncSharedStage);
		current.destroy(true);
	}
	const urls = MENU_VARIANTS.flatMap((variant) => {
		const files = buyBonusSpineUrls(variant);
		return [files.atlas, files.skeleton];
	});
	void PIXI.Assets.unload(urls).catch(() => {
		/* nothing cached */
	});
};

export const registerBuyBonusCardView = (
	variant: BuyBonusSpineVariant,
	host: HTMLElement,
	active: boolean,
): BuyBonusCardViewId => {
	const id = nextViewId;
	nextViewId += 1;
	views.set(id, { id, variant, host, active });
	cancelScheduledDestroy();
	void ensureApp().then((created) => {
		if (!created || !views.has(id)) return;
		void loadSpine(variant).then(() => {
			if (views.has(id)) requestSync();
		});
	});
	return id;
};

export const setBuyBonusCardViewActive = (id: BuyBonusCardViewId, active: boolean) => {
	const view = views.get(id);
	if (!view || view.active === active) return;
	view.active = active;
	if (!active) {
		requestSync();
		return;
	}
	cancelScheduledDestroy();
	void ensureApp().then((created) => {
		if (!created || !views.has(id)) return;
		void loadSpine(view.variant).then(() => {
			if (views.has(id)) requestSync();
		});
	});
};

export const unregisterBuyBonusCardView = (id: BuyBonusCardViewId) => {
	views.delete(id);
	if (views.size === 0 || !hasLiveView()) {
		scheduleDestroyIfIdle();
		return;
	}
	requestSync();
};
