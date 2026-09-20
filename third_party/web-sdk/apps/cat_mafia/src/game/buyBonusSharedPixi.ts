/**
 * Buy-bonus card visuals: one overlay WebGL for every card Spine.
 * Load when the user opens the menu; drop GPU on bonus purchase / FS;
 * remount after returning to base.
 */
import * as PIXI from 'pixi.js';
import { Cache } from 'pixi.js';
import type { TextureAtlas } from '@esotericsoftware/spine-core';
import { Spine, SpineTexture } from '@esotericsoftware/spine-pixi-v8';

import {
	BUY_BONUS_HIDDEN_SLOTS,
	BUY_BONUS_NORMAL_MASCOT_ANIM,
	BUY_BONUS_SPINE_ANIM,
	buyBonusNormalMascotUrls,
	buyBonusSpineUrls,
	getBuyBonusPixiTransform,
	getBuyBonusSpineBitmap,
	releaseBuyBonusSpineBitmaps,
	resumeBuyBonusSpineBitmapDecode,
	startBuyBonusSpineBitmapDecode,
	suspendBuyBonusSpineBitmapDecode,
	type BuyBonusSpineVariant,
} from './buyBonusHtmlSpine';
import { isBuyBonusCardSpineGpuLive, releaseAllBuyBonusCardSpinePlayers } from './buyBonusCardGpu';
import { isHtmlWebglPaused } from './htmlWebglPause';
import { isBuyBonusFlowOpen } from './isAnyMenuOpen';
import { isPhoneForAtlasDownscale } from './phoneSpineAtlasDownscale';
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
/** Frame spine, or (normal) Container: bg frame + shared white mascot + fg frame. */
type CardVisual = Spine | PIXI.Container;

const spines = new Map<BuyBonusSpineVariant, CardVisual>();
const loading = new Map<BuyBonusSpineVariant, Promise<CardVisual | null>>();

/** Blocks warm/recreate until settled base after a bought bonus / FS. */
const getFeatureEvictLock = () => gameEntrance.buyBonusFeatureEvictLock;
const setFeatureEvictLock = (locked: boolean) => {
	gameEntrance.buyBonusFeatureEvictLock = locked;
};

let app: PIXI.Application | undefined;
let appReady: Promise<PIXI.Application | undefined> | undefined;
let appGen = 0;
let nextViewId = 1;
let tickerBound = false;
let layerObserver: ResizeObserver | undefined;
let resizeListening = false;
let destroyTimer: ReturnType<typeof setTimeout> | undefined;
/** All three cards stay parked after the first open — dropping duel left a black card. */
const MENU_VARIANTS: readonly BuyBonusSpineVariant[] = ['normal', 'super', 'duel'];

const buyBonusAssetUrls = () =>
	MENU_VARIANTS.flatMap((variant) => {
		const urls = buyBonusSpineUrls(variant);
		return [urls.atlas, urls.skeleton, ...urls.images];
	});

const overlayOnlyUrls = () => buyBonusAssetUrls();

const evictCachedUrl = (url: string) => {
	try {
		if (Cache.has(url)) Cache.remove(url);
	} catch {
		/* already gone */
	}
};

const destroyCachedAtlasGpu = (atlasUrl: string) => {
	let atlas: TextureAtlas | undefined;
	try {
		atlas = PIXI.Assets.get(atlasUrl) as TextureAtlas | undefined;
	} catch {
		return;
	}
	if (!atlas?.pages?.length) return;
	for (const page of atlas.pages) {
		const pixiTex = (page.texture as SpineTexture | null)?.texture;
		if (!pixiTex) continue;
		try {
			pixiTex.destroy(true);
		} catch {
			/* already released */
		}
	}
};

const atlasPagesLive = (atlasUrl: string) => {
	try {
		const atlas = PIXI.Assets.get(atlasUrl) as TextureAtlas | undefined;
		if (!atlas?.pages?.length) return false;
		return atlas.pages.every((page) => {
			const pixiTex = (page.texture as SpineTexture | null)?.texture;
			return Boolean(pixiTex && !pixiTex.destroyed && !pixiTex.source?.destroyed);
		});
	} catch {
		return false;
	}
};

const variantTexturesLive = (variant: BuyBonusSpineVariant) => {
	if (!app) return false;
	if (!atlasPagesLive(buyBonusSpineUrls(variant).atlas)) return false;
	if (variant === 'normal' && !atlasPagesLive(buyBonusNormalMascotUrls().atlas)) return false;
	return true;
};

/**
 * Drop overlay-only atlas Cache after a WebGL teardown.
 * Never destroy(true) the shared white mascot — that atlas is the main-game cat.
 */
const purgeBuyBonusAssetCache = async () => {
	const urls = overlayOnlyUrls();
	for (const url of urls) destroyCachedAtlasGpu(url);
	try {
		await PIXI.Assets.unload(urls);
	} catch {
		/* cache already empty */
	}
	for (const url of urls) evictCachedUrl(url);
	atlasesDirty = false;
};

/** Only use decoded bitmaps when every atlas page is ready — a partial map loads a broken atlas. */
const atlasImagesFromBitmaps = (imageUrls: readonly string[]) => {
	const images: Record<string, PIXI.TextureSource> = {};
	for (const url of imageUrls) {
		const bitmap = getBuyBonusSpineBitmap(url);
		if (!bitmap) return null;
		const file = url.replace(/^.*\//, '');
		const source = PIXI.Texture.from(bitmap).source;
		source.label = file;
		images[file] = source;
	}
	return imageUrls.length > 0 ? images : null;
};

const dropDeadSpine = (variant: BuyBonusSpineVariant) => {
	const visual = spines.get(variant);
	if (!visual) return;
	// While the overlay GL app is alive, keep parked spines even if Cache briefly
	// looks cold — dropping here left areBuyBonusSpinesReady false and an empty menu.
	if (app) return;
	try {
		visual.destroy({ children: true, texture: false });
	} catch {
		/* already released */
	}
	spines.delete(variant);
	atlasesDirty = true;
};

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


const prepareBuyBonusSpineDraw = (spine: Spine, variant: BuyBonusSpineVariant) => {
	// Only hide designer reference stills. Do NOT strip Additive/Screen slots —
	// super card art is mostly additive; clearing them left empty cards.
	hideReferenceSlots(spine, variant);
};

const isTirSceneLive = () =>
	stateGame.targetPickOpen ||
	stateGame.targetPickSlide > 0.001 ||
	stateGame.drumShootActive;

/** True while buy-bonus may open again soon — keep GL + spines parked. */
export const shouldKeepBuyBonusWarm = () =>
	!getFeatureEvictLock() &&
	stateGame.gameType === 'basegame' &&
	!stateGame.freeSpinIntroActive &&
	!stateGame.transitionActive &&
	!stateDuel.active &&
	!isTirSceneLive();

const canOwnApp = () => {
	if (stateGame.gameType !== 'basegame' || stateDuel.active) return false;
	if (isBuyBonusFlowOpen()) return true;
	return shouldKeepBuyBonusWarm();
};

/** After FS cloud — brief pause so outro / tir GPU can drop before overlay WebGL returns. */
export const buyBonusWarmAfterFeatureMs = () => (isPhoneForAtlasDownscale() ? 900 : 450);

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

/** Serialize unload ↔ reload so a late FS unload cannot wipe a remounted atlas. */
let assetGate: Promise<void> = Promise.resolve();
let atlasesDirty = false;

const withBuyBonusAssets = async <T>(fn: () => Promise<T>): Promise<T> => {
	let release: () => void = () => undefined;
	const previous = assetGate;
	assetGate = new Promise<void>((resolve) => {
		release = resolve;
	});
	await previous;
	try {
		return await fn();
	} finally {
		release();
	}
};

const loadBuyBonusAtlasAndSkeleton = async (variant: BuyBonusSpineVariant) => {
	const urls = buyBonusSpineUrls(variant);
	await withBuyBonusAssets(async () => {
		if (atlasesDirty || !atlasPagesLive(urls.atlas)) await purgeBuyBonusAssetCache();
		const images = atlasImagesFromBitmaps(urls.images);
		if (images) {
			await PIXI.Assets.load([{ src: urls.atlas, data: { images } }, urls.skeleton]);
		} else {
			await PIXI.Assets.load([urls.atlas, urls.skeleton]);
		}
	});
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

const forceDropSpine = (variant: BuyBonusSpineVariant) => {
	const visual = spines.get(variant);
	if (!visual) return;
	try {
		visual.destroy({ children: true, texture: false });
	} catch {
		/* already released */
	}
	spines.delete(variant);
	atlasesDirty = true;
};

const loadSpine = (variant: BuyBonusSpineVariant) => {
	const existing = spines.get(variant);
	// Reuse only when GPU textures are actually live — otherwise redraw stays blank.
	if (existing && variantTexturesLive(variant)) return Promise.resolve(existing);
	if (existing) forceDropSpine(variant);
	const pending = loading.get(variant);
	if (pending) return pending;

	const task = runPhoneSerialized(async () => {
		const cached = spines.get(variant);
		if (cached && variantTexturesLive(variant)) return cached;
		if (cached) forceDropSpine(variant);
		if (!canOwnApp()) return null;
		void startBuyBonusSpineBitmapDecode();
		const createdApp = await ensureApp();
		if (!createdApp) return null;
		const gen = appGen;
		const urls = buyBonusSpineUrls(variant);
		if (gen !== appGen) return null;

		const loadAssets = async () => {
			await loadBuyBonusAtlasAndSkeleton(variant);
			if (variant === 'normal') {
				const mascot = buyBonusNormalMascotUrls();
				await PIXI.Assets.load([mascot.atlas, mascot.skeleton]);
			}
		};

		try {
			await loadAssets();
		} catch (error) {
			console.error('[buyBonus] atlas/skeleton load failed', variant, error);
			atlasesDirty = true;
			try {
				await loadAssets();
			} catch (retryError) {
				console.error('[buyBonus] atlas/skeleton retry failed', variant, retryError);
				return null;
			}
		}
		if (!app || gen !== appGen || !canOwnApp()) return null;
		const already = spines.get(variant);
		if (already && variantTexturesLive(variant)) return already;
		if (already) forceDropSpine(variant);

		try {
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
				// Keep the spine even if Cache briefly reports textures cold — throwing left the menu empty.
				if (!variantTexturesLive(variant)) {
					console.warn('[buyBonus] normal textures not live yet', variant);
				}
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
			if (!variantTexturesLive(variant)) {
				console.warn('[buyBonus] card textures not live yet', variant);
			}
			return spine;
		} catch (error) {
			console.error('[buyBonus] Spine.from failed', variant, error);
			atlasesDirty = true;
			return null;
		}
	}).finally(() => {
		loading.delete(variant);
	});

	loading.set(variant, task);
	return task;
};

export const whenBuyBonusSpinesReady = async (
	variants: readonly BuyBonusSpineVariant[] = MENU_VARIANTS,
) => {
	await Promise.all(variants.map((variant) => loadSpine(variant)));
};

export const areBuyBonusSpinesReady = (variants: readonly BuyBonusSpineVariant[] = MENU_VARIANTS) =>
	Boolean(app) && variants.every((variant) => spines.has(variant));

/** Overlay normal card shares `white/mascot_cat` — do not Assets.unload it. */
export const isBuyBonusWhiteMascotGpuLive = () =>
	isBuyBonusCardSpineGpuLive() ||
	(spines.has('normal') && atlasPagesLive(buyBonusNormalMascotUrls().atlas));

const syncBuyBonusWarmReadyFlag = () => {
	gameEntrance.buyBonusWarmReady = areBuyBonusSpinesReady(MENU_VARIANTS);
};

const markBuyBonusWarmSucceeded = () => {
	syncBuyBonusWarmReadyFlag();
	if (areBuyBonusSpinesReady(MENU_VARIANTS)) gameEntrance.buyBonusEverWarmed = true;
};

export const acknowledgeBuyBonusPresented = () => {
	markBuyBonusWarmSucceeded();
};

let warmPromise: Promise<void> | null = null;

/** Load on first Buy Bonus open; remount after FS. Never during a feature. */
export const ensureBuyBonusWarm = (): Promise<void> => {
	if (!canOwnApp()) return Promise.resolve();
	if (areBuyBonusSpinesReady(MENU_VARIANTS)) {
		markBuyBonusWarmSucceeded();
		return Promise.resolve();
	}
	if (warmPromise) return warmPromise;

	warmPromise = (async () => {
		try {
			resumeBuyBonusSpineBitmapDecode();
			const createdApp = await ensureApp();
			if (!createdApp || !canOwnApp()) return;
			await whenBuyBonusSpinesReady(MENU_VARIANTS);
			if (!app || !canOwnApp()) return;
			if (hasLiveView()) {
				flushBuyBonusSharedStage();
			} else {
				for (const spine of spines.values()) spine.visible = false;
				if (app.ticker.started) app.ticker.stop();
			}
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
	setFeatureEvictLock(false);
	resumeBuyBonusSpineBitmapDecode();
	cancelScheduledDestroy();
	const createdApp = await ensureApp();
	if (!createdApp) return;
	await whenBuyBonusSpinesReady(MENU_VARIANTS);
	flushBuyBonusSharedStage();
	markBuyBonusWarmSucceeded();
};

export const prepareBuyBonusMenu = async () => {
	setFeatureEvictLock(false);
	await ensureBuyBonusWarm();
	flushBuyBonusSharedStage();
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
		// Keep canvas under the card buttons so art shows through transparent cards.
		if (layer.firstChild !== app.canvas) layer.insertBefore(app.canvas, layer.firstChild);
		observeLayer(layer);
		return;
	}
	layer.insertBefore(app.canvas, layer.firstChild);
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

const unloadBuyBonusAssets = async () => {
	releaseBuyBonusSpineBitmaps();
	atlasesDirty = true;
	await withBuyBonusAssets(async () => {
		if (app || spines.size > 0) return;
		await purgeBuyBonusAssetCache();
	});
};

const cancelScheduledDestroy = () => {
	if (destroyTimer === undefined) return;
	clearTimeout(destroyTimer);
	destroyTimer = undefined;
};

const DESTROY_IDLE_MS = 80;

const teardownSharedStageSync = () => {
	cancelScheduledDestroy();
	appGen += 1;
	atlasesDirty = true;
	const inflight = [...loading.values()];
	for (const visual of spines.values()) {
		try {
			visual.destroy({ children: true, texture: false });
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

export const evictBuyBonusForFeature = async () => {
	setFeatureEvictLock(true);
	suspendBuyBonusSpineBitmapDecode();
	cancelScheduledDestroy();
	releaseAllBuyBonusCardSpinePlayers();
	gameEntrance.buyBonusPanelReady = false;
	gameEntrance.buyBonusWarmReady = false;
	await destroySharedStageAsync();
};

export const isBuyBonusFeatureEvictLocked = () => getFeatureEvictLock();

export const clearBuyBonusFeatureEvictLock = () => {
	setFeatureEvictLock(false);
	resumeBuyBonusSpineBitmapDecode();
};

export const releaseBuyBonusSharedStage = () => {
	if (hasLiveView()) {
		scheduleDestroyIfIdle();
		return;
	}
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
	if (!canOwnApp()) return;
	cancelScheduledDestroy();
	void ensureApp().then((created) => {
		if (!created || !views.has(id) || !canOwnApp()) return;
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
		if (!shouldKeepBuyBonusWarm()) scheduleDestroyIfIdle();
		return;
	}
	requestSync();
};
