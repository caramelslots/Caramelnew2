/**
 * Buy-bonus card visuals: one overlay WebGL for every card Spine.
 * Parked in basegame; dropped in Normal / Super / Duel.
 * Phone uses the same overlay (no holes, no second copy on the slot).
 */
import * as PIXI from 'pixi.js';
import { BlendMode, Spine } from '@esotericsoftware/spine-pixi-v8';

import {
	BUY_BONUS_HIDDEN_SLOTS,
	BUY_BONUS_SPINE_ANIM,
	BUY_BONUS_SPINE_FILES,
	BUY_BONUS_SPINE_VIEWPORTS,
	buyBonusSpineUrls,
	getBuyBonusPixiTransform,
	getBuyBonusSpineBitmap,
	releaseBuyBonusSpineBitmaps,
	resumeBuyBonusSpineBitmapDecode,
	startBuyBonusSpineBitmapDecode,
	suspendBuyBonusSpineBitmapDecode,
	type BuyBonusSpineVariant,
} from './buyBonusHtmlSpine';
import { isHtmlWebglPaused } from './htmlWebglPause';
import {
	compactBuyBonusAtlasByUrl,
	isPhoneForAtlasDownscale,
} from './phoneSpineAtlasDownscale';
import { gameEntrance } from './gameEntrance.svelte';
import { stateDuel } from './stateDuel.svelte';
import { stateGame } from './stateGame.svelte';

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

/** Blocks warm/recreate until basegame remount after Normal / Super / Duel. */
let buyBonusFeatureEvictLock = false;

let app: PIXI.Application | undefined;
let appReady: Promise<PIXI.Application | undefined> | undefined;
let appGen = 0;
let nextViewId = 1;
let tickerBound = false;
let layerObserver: ResizeObserver | undefined;
let resizeListening = false;
let destroyTimer: ReturnType<typeof setTimeout> | undefined;
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

/**
 * Menu cards only need the character + frame. Additive / screen slots
 * (rays, glows, duplicate tint layers) composite as see-through “x-ray”
 * over the opaque body on a transparent WebGL canvas.
 */
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

const isTirSceneLive = () =>
	stateGame.targetPickOpen ||
	stateGame.targetPickSlide > 0.001 ||
	stateGame.drumShootActive;

/** True while buy-bonus may open again soon — keep GL + spines parked. */
export const shouldKeepBuyBonusWarm = () =>
	!buyBonusFeatureEvictLock &&
	stateGame.gameType === 'basegame' &&
	!stateGame.freeSpinIntroActive &&
	!stateGame.transitionActive &&
	!stateDuel.active &&
	!isTirSceneLive();

/**
 * Hard gate for creating / loading buy-bonus GPU.
 * Must NOT be `views.size > 0 || shouldKeep` — sticky card hosts after the first
 * menu open remounted WebGL during freeSpinIntro / extra spins → Jetsam.
 */
const canOwnApp = () => shouldKeepBuyBonusWarm();

/**
 * After FS/Duel cloud finishes — remount delay so outro / mascot swap / leftover
 * SW GPU can drop before the overlay WebGL comes back. First-entry warm is
 * owned by GameAssetsLoader (no extra wait).
 */
export const buyBonusWarmAfterFeatureMs = () => (isPhoneForAtlasDownscale() ? 2500 : 1500);

const visualZoom = () =>
	typeof window === 'undefined' ? 1 : Math.max(1, window.visualViewport?.scale ?? 1);

/** Overlay canvas only — never the slot renderer. Phone 2×; desktop 3×. */
const buyBonusHostResolution = () =>
	(isPhoneForAtlasDownscale() ? 2 : 3) / visualZoom();

/**
 * Force-drop buy-bonus WebGL + atlases before Normal / Super / Duel GPU grows.
 * Stays locked until {@link clearBuyBonusFeatureEvictLock} (settled basegame).
 */
export const evictBuyBonusForFeature = async () => {
	buyBonusFeatureEvictLock = true;
	suspendBuyBonusSpineBitmapDecode();
	cancelScheduledDestroy();
	await destroySharedStageAsync();
};

/**
 * Allow opening / remounting buy-bonus after returning to basegame.
 * Lifecycle waits for the cloud to finish, then warms in the background.
 * A Buy Bonus press still loads immediately via {@link prepareBuyBonusMenu}.
 */
export const clearBuyBonusFeatureEvictLock = () => {
	buyBonusFeatureEvictLock = false;
	resumeBuyBonusSpineBitmapDecode();
};

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
		if (gen !== appGen || !canOwnApp()) {
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

const yieldFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const buyBonusAssetUrls = () =>
	MENU_VARIANTS.flatMap((variant) => {
		const urls = buyBonusSpineUrls(variant);
		return [urls.atlas, urls.skeleton, ...urls.images];
	});

const unloadBuyBonusAssets = async () => {
	releaseBuyBonusSpineBitmaps();
	try {
		await PIXI.Assets.unload(buyBonusAssetUrls());
	} catch {
		/* cache already empty / mid-recreate */
	}
};

const loadBuyBonusAtlasAndSkeleton = (variant: BuyBonusSpineVariant) => {
	const urls = buyBonusSpineUrls(variant);
	const files = BUY_BONUS_SPINE_FILES[variant];
	const images: Record<string, PIXI.TextureSource> = {};
	for (let i = 0; i < files.images.length; i += 1) {
		const page = files.images[i];
		const url = urls.images[i];
		if (!page || !url) continue;
		const bitmap = getBuyBonusSpineBitmap(url);
		if (!bitmap) continue;
		images[page] = PIXI.Texture.from(bitmap, true).source;
	}
	if (Object.keys(images).length === 0) {
		return PIXI.Assets.load([urls.atlas, urls.skeleton]);
	}
	return PIXI.Assets.load([{ src: urls.atlas, data: { images } }, urls.skeleton]);
};

/** Serialize phone atlas work — parallel 3×4K decode is the Jetsam spike. */
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

const loadSpine = (variant: BuyBonusSpineVariant) => {
	const existing = spines.get(variant);
	if (existing) return Promise.resolve(existing);
	const pending = loading.get(variant);
	if (pending) return pending;

	const task = runPhoneSerialized(async () => {
		const cached = spines.get(variant);
		if (cached) return cached;
		if (!canOwnApp()) return null;
		// Finish CPU decode (started on cards idle) before overlay GL upload.
		await startBuyBonusSpineBitmapDecode();
		const createdApp = await ensureApp();
		if (!createdApp || !canOwnApp()) return null;
		// Capture AFTER ensureApp — create bumps appGen; only destroy should abort.
		const gen = appGen;
		const urls = buyBonusSpineUrls(variant);
		if (gen !== appGen) return null;
		try {
			await loadBuyBonusAtlasAndSkeleton(variant);
		} catch {
			return null;
		}
		if (!app || gen !== appGen || !canOwnApp()) return null;
		// Keep cat/frame/WILD at native pixels; drop SW FX pages (wheel/rays/arch).
		if (isPhoneForAtlasDownscale()) {
			compactBuyBonusAtlasByUrl(urls.atlas);
			releaseBuyBonusSpineBitmaps(urls.images);
			await yieldFrame();
			if (!app || gen !== appGen || !canOwnApp()) return null;
		}
		const already = spines.get(variant);
		if (already) return already;
		const spine = Spine.from({
			skeleton: urls.skeleton,
			atlas: urls.atlas,
			autoUpdate: false,
		});
		spine.state.setAnimation(0, BUY_BONUS_SPINE_ANIM[variant], true);
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
		// Warm-keep parks spines with no hosts — do not treat that as idle teardown.
		if (!hasLiveView() && !shouldKeepBuyBonusWarm()) scheduleDestroyIfIdle();
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
	const missing = variants.filter((variant) => !spines.has(variant));
	if (missing.length === 0) return;
	if (isPhoneForAtlasDownscale()) {
		for (const variant of missing) await loadSpine(variant);
		return;
	}
	await Promise.all(missing.map((variant) => loadSpine(variant)));
};

export const areBuyBonusSpinesReady = (variants: readonly BuyBonusSpineVariant[] = MENU_VARIANTS) =>
	variants.every((variant) => spines.has(variant));

const syncBuyBonusWarmReadyFlag = () => {
	gameEntrance.buyBonusWarmReady = areBuyBonusSpinesReady();
};

let warmPromise: Promise<void> | null = null;

/**
 * Background warm: overlay WebGL + parked spines.
 */
export const ensureBuyBonusWarm = (): Promise<void> => {
	if (!shouldKeepBuyBonusWarm()) return Promise.resolve();
	if (areBuyBonusSpinesReady()) {
		syncBuyBonusWarmReadyFlag();
		return Promise.resolve();
	}
	if (warmPromise) return warmPromise;

	warmPromise = (async () => {
		try {
			const createdApp = await ensureApp();
			if (!createdApp || !shouldKeepBuyBonusWarm()) return;
			await whenBuyBonusSpinesReady();
			if (!app || !shouldKeepBuyBonusWarm()) return;
			for (const spine of spines.values()) spine.visible = false;
			if (app.ticker.started) app.ticker.stop();
			syncBuyBonusWarmReadyFlag();
		} finally {
			warmPromise = null;
			syncBuyBonusWarmReadyFlag();
		}
	})();

	return warmPromise;
};

/** Force one layout/render pass (e.g. while the menu is still opacity:0). */
export const flushBuyBonusSharedStage = () => {
	requestSync();
};

export const ensureBuyBonusMenuOpen = async () => {
	buyBonusFeatureEvictLock = false;
	await whenBuyBonusSpinesReady();
	flushBuyBonusSharedStage();
	syncBuyBonusWarmReadyFlag();
};

const waitMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Phone: do not create buy-bonus GL while batch 4 (tir / fsCong) is still decoding. */
const waitForPostLiftAssetsReady = async () => {
	if (!isPhoneForAtlasDownscale() || gameEntrance.postLiftAssetsReady) return;
	const start = performance.now();
	while (!gameEntrance.postLiftAssetsReady && performance.now() - start < 20000) {
		await waitMs(50);
	}
};

/**
 * Call from the Buy Bonus button BEFORE opening the modal.
 */
export const prepareBuyBonusMenu = async () => {
	buyBonusFeatureEvictLock = false;
	await waitForPostLiftAssetsReady();
	if (areBuyBonusSpinesReady()) {
		flushBuyBonusSharedStage();
		syncBuyBonusWarmReadyFlag();
		gameEntrance.buyBonusEverWarmed = true;
		return;
	}
	await ensureBuyBonusWarm();
	if (!areBuyBonusSpinesReady()) await whenBuyBonusSpinesReady();
	flushBuyBonusSharedStage();
	syncBuyBonusWarmReadyFlag();
	if (areBuyBonusSpinesReady()) gameEntrance.buyBonusEverWarmed = true;
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
	spine: Spine,
	variant: BuyBonusSpineVariant,
	host: HTMLElement,
	layer: HTMLElement,
) => {
	const zoom = visualZoom();
	const hostRect = host.getBoundingClientRect();
	const w = hostRect.width / zoom;
	const h = hostRect.height / zoom;
	if (w < 2 || h < 2) {
		spine.visible = false;
		return;
	}
	const transform = getBuyBonusPixiTransform(variant, w, h);
	const button = cardButton(host);
	const disabled = Boolean(button?.disabled);
	spine.alpha = disabled ? 0.5 : 1;
	spine.tint = 0xffffff;
	spine.visible = true;
	const layerRect = layer.getBoundingClientRect();
	spine.scale.set(transform.scale);
	spine.x = (hostRect.left - layerRect.left) / zoom + w * 0.5 + transform.spineX;
	spine.y = (hostRect.top - layerRect.top) / zoom + h * 0.5 + transform.spineY;
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
		scheduleDestroyIfIdle();
		return;
	}

	cancelScheduledDestroy();
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
		const spine = spines.get(variant);
		if (!spine) continue;
		const view =
			visible.find((item) => item.variant === variant && item.active) ??
			visible.find((item) => item.variant === variant);
		if (!view) {
			spine.visible = false;
			continue;
		}
		layoutSpine(spine, variant, view.host, layer);
		if (dt > 0 && view.active) spine.update(dt);
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

const cancelScheduledDestroy = () => {
	if (destroyTimer === undefined) return;
	clearTimeout(destroyTimer);
	destroyTimer = undefined;
};

/** Cover buyBonus → confirm remount only on the cold path (not base warm-keep). */
const DESTROY_IDLE_MS = 80;

const scheduleDestroyIfIdle = () => {
	if (shouldKeepBuyBonusWarm()) {
		cancelScheduledDestroy();
		return;
	}
	cancelScheduledDestroy();
	destroyTimer = setTimeout(() => {
		destroyTimer = undefined;
		destroyIfIdle();
	}, DESTROY_IDLE_MS);
};

/** Tear down overlay GL. */
const teardownSharedStageSync = () => {
	cancelScheduledDestroy();
	appGen += 1;
	const inflight = [...loading.values()];
	for (const spine of spines.values()) {
		try {
			spine.destroy({ children: true, texture: false });
		} catch {
			/* already released */
		}
	}
	spines.clear();
	loading.clear();
	views.clear();
	gameEntrance.buyBonusWarmReady = false;
	const current = app;
	app = undefined;
	appReady = undefined;
	warmPromise = null;
	tickerBound = false;
	layerObserver?.disconnect();
	layerObserver = undefined;
	if (resizeListening) {
		window.removeEventListener('resize', requestSync);
		window.visualViewport?.removeEventListener('resize', requestSync);
		window.visualViewport?.removeEventListener('scroll', requestSync);
		resizeListening = false;
	}
	if (current) {
		current.ticker.remove(tickSharedStage);
		current.destroy(true);
	}
	return inflight;
};

const destroySharedStage = () => {
	const inflight = teardownSharedStageSync();
	void Promise.allSettled(inflight).then(() => {
		void unloadBuyBonusAssets();
	});
};

const destroySharedStageAsync = async () => {
	const inflight = teardownSharedStageSync();
	await Promise.allSettled(inflight);
	await unloadBuyBonusAssets();
};

const destroyIfIdle = () => {
	if (loading.size > 0 || hasLiveView()) return;
	if (shouldKeepBuyBonusWarm()) return;
	destroySharedStage();
};

/** Drop warm GL when entering FS / leaving base — call from lifecycle effect. */
export const releaseBuyBonusSharedStage = () => {
	if (hasLiveView()) {
		// Menu still open — destroy after hosts go idle (cold path only).
		scheduleDestroyIfIdle();
		return;
	}
	// Bumps appGen so in-flight ensureBuyBonusWarm / loadSpine abort.
	destroySharedStage();
};

export const registerBuyBonusCardView = (
	variant: BuyBonusSpineVariant,
	host: HTMLElement,
	active: boolean,
): BuyBonusCardViewId => {
	const id = nextViewId;
	nextViewId += 1;
	views.set(id, { id, variant, host, active });
	if (!canOwnApp()) return id;
	cancelScheduledDestroy();
	void ensureApp().then((created) => {
		if (!created || !views.has(id) || !canOwnApp()) return;
		void loadSpine(variant).then(() => {
			if (views.has(id) && canOwnApp()) requestSync();
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
	if (!canOwnApp()) return;
	cancelScheduledDestroy();
	void ensureApp().then((created) => {
		if (!created || !views.has(id) || !canOwnApp()) return;
		void loadSpine(view.variant).then(() => {
			if (views.has(id) && canOwnApp()) requestSync();
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
