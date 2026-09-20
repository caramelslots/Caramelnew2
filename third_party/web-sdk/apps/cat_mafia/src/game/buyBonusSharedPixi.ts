/**
 * Buy-bonus card visuals: one overlay WebGL for every card Spine.
 * Warm once on game entry; keep in memory for the session (open/close only).
 */
import * as PIXI from 'pixi.js';
import { BlendMode, Spine } from '@esotericsoftware/spine-pixi-v8';

import {
	BUY_BONUS_HIDDEN_SLOTS,
	BUY_BONUS_NORMAL_MASCOT_ANIM,
	BUY_BONUS_SPINE_ANIM,
	buyBonusNormalMascotUrls,
	buyBonusSpineUrls,
	getBuyBonusPixiTransform,
	resumeBuyBonusSpineBitmapDecode,
	startBuyBonusSpineBitmapDecode,
	type BuyBonusSpineVariant,
} from './buyBonusHtmlSpine';
import { isHtmlWebglPaused } from './htmlWebglPause';
import { isPhoneForAtlasDownscale } from './phoneSpineAtlasDownscale';
import { gameEntrance } from './gameEntrance.svelte';

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
/** Frame spine, or (normal) Container: bg frame + shared white mascot + fg frame. */
type CardVisual = Spine | PIXI.Container;

const spines = new Map<BuyBonusSpineVariant, CardVisual>();
const loading = new Map<BuyBonusSpineVariant, Promise<CardVisual | null>>();

let app: PIXI.Application | undefined;
let appReady: Promise<PIXI.Application | undefined> | undefined;
let appGen = 0;
let nextViewId = 1;
let tickerBound = false;
let layerObserver: ResizeObserver | undefined;
let resizeListening = false;
const MENU_VARIANTS: readonly BuyBonusSpineVariant[] = ['normal', 'super', 'duel'];

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
		if (!preparing && Number.parseFloat(style.opacity) === 0) return false;
		node = node.parentElement;
	}
	return true;
};

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

const hideSpecialBlendSlots = (spine: Spine) => {
	for (const slot of spine.skeleton.slots) {
		if (slot.data.blendMode === BlendMode.Normal) continue;
		slot.setAttachment(null);
	}
};

const prepareBuyBonusSpineDraw = (spine: Spine, variant: BuyBonusSpineVariant) => {
	hideReferenceSlots(spine, variant);
	hideSpecialBlendSlots(spine);
};

const visualZoom = () =>
	typeof window === 'undefined' ? 1 : Math.max(1, window.visualViewport?.scale ?? 1);

const buyBonusHostResolution = () =>
	(isPhoneForAtlasDownscale() ? 2 : 3) / visualZoom();

const ensureApp = (): Promise<PIXI.Application | undefined> => {
	if (app) return Promise.resolve(app);
	if (appReady) return appReady;

	const gen = ++appGen;
	const pending = (async () => {
		const next = new PIXI.Application();
		const phone = isPhoneForAtlasDownscale();
		await next.init({
			width: 4,
			height: 4,
			backgroundAlpha: 0,
			antialias: !phone,
			autoDensity: true,
			preference: 'webgl',
			powerPreference: phone ? 'low-power' : 'high-performance',
			resolution: buyBonusHostResolution(),
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
		next.canvas.style.zIndex = '0';
		next.canvas.setAttribute('aria-hidden', 'true');
		app = next;
		if (!tickerBound) {
			next.ticker.maxFPS = phone ? 30 : 60;
			next.ticker.add(tickSharedStage);
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

const loadBuyBonusAtlasAndSkeleton = async (variant: BuyBonusSpineVariant) => {
	const urls = buyBonusSpineUrls(variant);
	await PIXI.Assets.load([urls.atlas, urls.skeleton]);
};

/** Serialize phone atlas work — parallel 3× decode is a Jetsam spike. */
let phoneLoadChain: Promise<void> = Promise.resolve();

const runPhoneSerialized = <T>(fn: () => Promise<T>): Promise<T> => {
	if (!isPhoneForAtlasDownscale()) return fn();
	const run = phoneLoadChain.then(fn, fn);
	phoneLoadChain = run.then(
		() => undefined,
		() => undefined,
	);
	return run;
};

const NORMAL_BG_SLOT = 'normal_background';

const isCardSpine = (visual: CardVisual): visual is Spine => visual instanceof Spine;

const forEachCardSpine = (visual: CardVisual, fn: (spine: Spine) => void) => {
	if (isCardSpine(visual)) {
		fn(visual);
		return;
	}
	const visit = (node: PIXI.Container) => {
		for (const child of node.children) {
			if (child instanceof Spine) fn(child);
			else if (child instanceof PIXI.Container) visit(child);
		}
	};
	visit(visual);
};

const applyNormalFrameLayer = (spine: Spine, layer: 'bg' | 'fg') => {
	for (const slot of spine.skeleton.slots) {
		const isBg = slot.data.name === NORMAL_BG_SLOT;
		const keep = layer === 'bg' ? isBg : !isBg;
		if (!keep) slot.setAttachment(null);
	}
};

const createFrameSpine = (variant: BuyBonusSpineVariant, urls: ReturnType<typeof buyBonusSpineUrls>) => {
	const spine = Spine.from({
		skeleton: urls.skeleton,
		atlas: urls.atlas,
		autoUpdate: false,
	});
	spine.state.setAnimation(0, BUY_BONUS_SPINE_ANIM[variant], true);
	return spine;
};

const loadSpine = (variant: BuyBonusSpineVariant) => {
	const existing = spines.get(variant);
	if (existing) return Promise.resolve(existing);
	const pending = loading.get(variant);
	if (pending) return pending;

	const task = runPhoneSerialized(async () => {
		const cached = spines.get(variant);
		if (cached) return cached;
		void startBuyBonusSpineBitmapDecode();
		const createdApp = await ensureApp();
		if (!createdApp) return null;
		const gen = appGen;
		const urls = buyBonusSpineUrls(variant);
		if (gen !== appGen) return null;
		try {
			await loadBuyBonusAtlasAndSkeleton(variant);
			if (variant === 'normal') {
				const mascot = buyBonusNormalMascotUrls();
				await PIXI.Assets.load([mascot.atlas, mascot.skeleton]);
			}
		} catch (error) {
			console.error('[buyBonus] atlas/skeleton load failed', variant, error);
			return null;
		}
		if (!app || gen !== appGen) return null;
		const already = spines.get(variant);
		if (already) return already;

		if (variant === 'normal') {
			const mascotUrls = buyBonusNormalMascotUrls();
			const bg = createFrameSpine(variant, urls);
			const fg = createFrameSpine(variant, urls);
			const mascot = Spine.from({
				skeleton: mascotUrls.skeleton,
				atlas: mascotUrls.atlas,
				autoUpdate: false,
			});
			mascot.state.setAnimation(0, BUY_BONUS_NORMAL_MASCOT_ANIM, true);

			const wireFrame = (spine: Spine, layer: 'bg' | 'fg') => {
				const previousBefore = spine.beforeUpdateWorldTransforms;
				spine.beforeUpdateWorldTransforms = (self) => {
					previousBefore?.(self);
					prepareBuyBonusSpineDraw(self, variant);
					applyNormalFrameLayer(self, layer);
				};
				spine.update(0);
				prepareBuyBonusSpineDraw(spine, variant);
				applyNormalFrameLayer(spine, layer);
			};
			wireFrame(bg, 'bg');
			wireFrame(fg, 'fg');
			mascot.update(0);

			const root = new PIXI.Container();
			root.addChild(bg, mascot, fg);
			root.visible = false;
			createdApp.stage.addChild(root);
			spines.set(variant, root);
			return root;
		}

		const spine = createFrameSpine(variant, urls);
		const previousBefore = spine.beforeUpdateWorldTransforms;
		spine.beforeUpdateWorldTransforms = (self) => {
			previousBefore?.(self);
			prepareBuyBonusSpineDraw(self, variant);
		};
		spine.update(0);
		prepareBuyBonusSpineDraw(spine, variant);
		spine.visible = false;
		createdApp.stage.addChild(spine);
		spines.set(variant, spine);
		return spine;
	}).finally(() => {
		loading.delete(variant);
	});

	loading.set(variant, task);
	return task;
};

export const whenBuyBonusSpinesReady = async (
	variants: readonly BuyBonusSpineVariant[] = MENU_VARIANTS,
) => {
	if (isPhoneForAtlasDownscale()) {
		for (const variant of variants) await loadSpine(variant);
	} else {
		await Promise.all(variants.map((variant) => loadSpine(variant)));
	}
};

export const areBuyBonusSpinesReady = (variants: readonly BuyBonusSpineVariant[] = MENU_VARIANTS) =>
	variants.every((variant) => spines.has(variant));

const syncBuyBonusWarmReadyFlag = () => {
	gameEntrance.buyBonusWarmReady = areBuyBonusSpinesReady();
};

const markBuyBonusWarmSucceeded = () => {
	syncBuyBonusWarmReadyFlag();
	if (areBuyBonusSpinesReady()) gameEntrance.buyBonusEverWarmed = true;
};

export const acknowledgeBuyBonusPresented = () => {
	markBuyBonusWarmSucceeded();
};

let warmPromise: Promise<void> | null = null;

/** Load once on game entry; keep parked for the whole session. */
export const ensureBuyBonusWarm = (): Promise<void> => {
	if (areBuyBonusSpinesReady()) {
		markBuyBonusWarmSucceeded();
		return Promise.resolve();
	}
	if (warmPromise) return warmPromise;

	warmPromise = (async () => {
		try {
			resumeBuyBonusSpineBitmapDecode();
			const createdApp = await ensureApp();
			if (!createdApp) return;
			await whenBuyBonusSpinesReady();
			if (!app) return;
			for (const spine of spines.values()) spine.visible = false;
			if (app.ticker.started) app.ticker.stop();
			markBuyBonusWarmSucceeded();
		} finally {
			warmPromise = null;
			syncBuyBonusWarmReadyFlag();
		}
	})();

	return warmPromise;
};

export const flushBuyBonusSharedStage = () => {
	requestSync();
};

export const ensureBuyBonusMenuOpen = async () => {
	resumeBuyBonusSpineBitmapDecode();
	if (!areBuyBonusSpinesReady()) {
		await whenBuyBonusSpinesReady();
	}
	flushBuyBonusSharedStage();
	markBuyBonusWarmSucceeded();
};

const waitMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const waitForPostLiftAssetsReady = async () => {
	if (!isPhoneForAtlasDownscale() || gameEntrance.postLiftAssetsReady) return;
	const start = performance.now();
	while (!gameEntrance.postLiftAssetsReady && performance.now() - start < 20000) {
		await waitMs(50);
	}
};

export const prepareBuyBonusMenu = async () => {
	await waitForPostLiftAssetsReady();
	resumeBuyBonusSpineBitmapDecode();
	if (!areBuyBonusSpinesReady()) {
		await whenBuyBonusSpinesReady();
	}
	flushBuyBonusSharedStage();
	markBuyBonusWarmSucceeded();
};

const observeLayer = (layer: HTMLElement) => {
	if (!layerObserver) {
		layerObserver = new ResizeObserver(() => requestSync());
	}
	layerObserver.disconnect();
	layerObserver.observe(layer);
	if (!resizeListening) {
		window.addEventListener('resize', requestSync);
		window.visualViewport?.addEventListener('resize', requestSync);
		window.visualViewport?.addEventListener('scroll', requestSync);
		resizeListening = true;
	}
};

const attachCanvas = (layer: HTMLElement) => {
	if (!app) return;
	if (app.canvas.parentElement === layer) {
		observeLayer(layer);
		return;
	}
	layer.appendChild(app.canvas);
	observeLayer(layer);
};

const resizeCanvas = (layer: HTMLElement) => {
	if (!app) return;
	const { w, h } = hostBox(layer);
	if (w < 2 || h < 2) return;
	const dpr = buyBonusHostResolution();
	if (app.renderer.resolution !== dpr) app.renderer.resolution = dpr;
	if (app.renderer.width !== w || app.renderer.height !== h) {
		app.renderer.resize(w, h);
	}
	app.canvas.style.width = '100%';
	app.canvas.style.height = '100%';
};

const cardButton = (host: HTMLElement) => host.closest('button');

const layoutSpine = (
	visual: CardVisual,
	variant: BuyBonusSpineVariant,
	host: HTMLElement,
	layer: HTMLElement,
) => {
	const zoom = visualZoom();
	const hostRect = host.getBoundingClientRect();
	const w = hostRect.width / zoom;
	const h = hostRect.height / zoom;
	if (w < 2 || h < 2) {
		visual.visible = false;
		return;
	}
	const transform = getBuyBonusPixiTransform(variant, w, h);
	const button = cardButton(host);
	const disabled = Boolean(button?.disabled);
	visual.alpha = disabled ? 0.5 : 1;
	if (isCardSpine(visual)) visual.tint = 0xffffff;
	visual.visible = true;
	const layerRect = layer.getBoundingClientRect();
	visual.scale.set(transform.scale);
	visual.x = (hostRect.left - layerRect.left) / zoom + w * 0.5 + transform.spineX;
	visual.y = (hostRect.top - layerRect.top) / zoom + h * 0.5 + transform.spineY;
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

let lastSpineAdvanceMs = 0;

const layoutAndDraw = (advance: boolean) => {
	if (!app) return;

	const visible: CardView[] = [];
	for (const view of views.values()) {
		if (isDisplayed(view.host)) visible.push(view);
	}

	const layer = pickLayer(visible);
	if (!layer) {
		for (const spine of spines.values()) spine.visible = false;
		lastSpineAdvanceMs = 0;
		app.ticker.stop();
		return;
	}

	attachCanvas(layer);
	resizeCanvas(layer);

	const playing = visible.some((view) => view.active) && !isHtmlWebglPaused();
	let dt = 0;
	if (advance && playing) {
		const now = performance.now();
		dt = lastSpineAdvanceMs === 0 ? 0 : Math.min((now - lastSpineAdvanceMs) / 1000, 0.05);
		lastSpineAdvanceMs = now;
	} else if (!playing) {
		lastSpineAdvanceMs = 0;
	}

	for (const variant of spines.keys()) {
		const visual = spines.get(variant);
		if (!visual) continue;
		const view =
			visible.find((item) => item.variant === variant && item.active) ??
			visible.find((item) => item.variant === variant);
		if (!view) {
			visual.visible = false;
			continue;
		}
		layoutSpine(visual, variant, view.host, layer);
		if (dt > 0 && view.active) {
			forEachCardSpine(visual, (spine) => spine.update(dt));
		}
	}

	app.render();

	if (!playing && app.ticker.started) app.ticker.stop();
};

const tickSharedStage = () => layoutAndDraw(true);

const requestSync = () => {
	if (!app) return;
	if (!app.ticker.started) app.ticker.start();
	layoutAndDraw(false);
};

export const registerBuyBonusCardView = (
	variant: BuyBonusSpineVariant,
	host: HTMLElement,
	active: boolean,
): BuyBonusCardViewId => {
	const id = nextViewId;
	nextViewId += 1;
	views.set(id, { id, variant, host, active });
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
		if (app?.ticker.started) app.ticker.stop();
		for (const spine of spines.values()) spine.visible = false;
		return;
	}
	requestSync();
};
