/**
 * Buy-flow overlay WebGL: buy-bonus cards + duel pick mascots (cat/dog).
 * One Pixi app for menu → confirm → duel pick → duel confirm (and in-round duel pick).
 * Drop GPU on bonus purchase / FS; remount after returning to base.
 */
import * as PIXI from 'pixi.js';
import { Cache } from 'pixi.js';
import {
	AtlasAttachmentLoader,
	SkeletonJson,
	Spine,
	SpineTexture,
	TextureAtlas,
} from '@esotericsoftware/spine-pixi-v8';

import {
	BUY_BONUS_HIDDEN_SLOTS,
	BUY_BONUS_NORMAL_MASCOT_ANIM,
	BUY_BONUS_SPINE_ANIM,
	buyBonusNormalMascotUrls,
	buyBonusSpineUrls,
	getBuyBonusPixiTransform,
	type BuyBonusSpineVariant,
} from './buyBonusHtmlSpine';
import { isBuyBonusCardSpineGpuLive, releaseAllBuyBonusCardSpinePlayers } from './buyBonusCardGpu';
import { releaseBuyBonusNormalStreetStill } from './buyBonusNormalStreetStill';
import { isHtmlWebglPaused } from './htmlWebglPause';
import { isBuyBonusFlowOpen } from './isAnyMenuOpen';
import { isPhoneForAtlasDownscale } from './phoneSpineAtlasDownscale';
import { releaseCpuTextureTwins } from './releaseCpuTextureTwins';
import { gameEntrance } from './gameEntrance.svelte';
import {
	getMascotPixiTransform,
	MASCOT_DOG_SPINE_VIEWPORT,
	MASCOT_SPINE_VIEWPORT,
	resolveMascotSpineUrl,
} from './mascotHtmlSpine';
import { stateDuel } from './stateDuel.svelte';

export type BuyBonusCardViewId = number;
export type BuyBonusPickSpecies = 'cat' | 'dog';

type CardView = {
	id: BuyBonusCardViewId;
	kind: 'card';
	variant: BuyBonusSpineVariant;
	host: HTMLElement;
	active: boolean;
};

type PickView = {
	id: BuyBonusCardViewId;
	kind: 'pick';
	species: BuyBonusPickSpecies;
	host: HTMLElement;
	active: boolean;
	mirror: boolean;
};

type OverlayView = CardView | PickView;

const LAYER_SELECTOR = '[data-buy-bonus-spine-layer]';
const CANVAS_CLASS = 'buy-bonus-shared-spine-canvas';

const views = new Map<BuyBonusCardViewId, OverlayView>();
/** Frame spine, or (normal) Container: bg frame + shared white mascot + fg frame. */
type CardVisual = Spine | PIXI.Container;

const spines = new Map<BuyBonusSpineVariant, CardVisual>();
const loading = new Map<BuyBonusSpineVariant, Promise<CardVisual | null>>();
const pickSpines = new Map<BuyBonusPickSpecies, Spine>();
const pickLoading = new Map<BuyBonusPickSpecies, Promise<Spine | null>>();

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

/** Spine.from caches SkeletonData as `${skeleton}-${atlas}-${scale}` — must die with the atlas. */
const spineFromCacheKey = (skeletonUrl: string, atlasUrl: string, scale = 1) =>
	`${skeletonUrl}-${atlasUrl}-${scale}`;

const buyBonusSpineFromCacheKeys = () => {
	const keys: string[] = [];
	for (const variant of MENU_VARIANTS) {
		const urls = buyBonusSpineUrls(variant);
		keys.push(spineFromCacheKey(urls.skeleton, urls.atlas));
		if (variant === 'normal') {
			const mascot = buyBonusNormalMascotUrls();
			keys.push(spineFromCacheKey(mascot.skeleton, mascot.atlas));
		}
	}
	return keys;
};

const evictBuyBonusSpineFromCache = () => {
	for (const key of buyBonusSpineFromCacheKeys()) evictCachedUrl(key);
};

const evictCachedUrl = (url: string) => {
	try {
		if (Cache.has(url)) Cache.remove(url);
	} catch {
		/* already gone */
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
 * Never destroy(true) — that races the main Pixi BindGroups (`_resourceId`).
 * Never touch the shared white mascot atlas (main-game cat).
 * Always drop Spine.from SkeletonData keys — otherwise remount paints black (dead GPU pages).
 */
const purgeBuyBonusAssetCache = async () => {
	evictBuyBonusSpineFromCache();
	const urls = overlayOnlyUrls();
	try {
		await PIXI.Assets.unload(urls);
	} catch {
		/* cache already empty */
	}
	for (const url of urls) evictCachedUrl(url);
	atlasesDirty = false;
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

/**
 * Formerly parked overlay GL + atlases on base for instant open.
 * Disabled: warm cost (~fb:buyBonus + card atlases + CPU twins) outweighed the UX.
 * HTTP preload still runs; WebGL loads on first menu open.
 */
export const shouldKeepBuyBonusWarm = () => false;

/** Own overlay GL for buy-flow + in-round duel side pick. */
const canOwnApp = () => {
	if (isBuyBonusFlowOpen()) return true;
	if (stateDuel.phase === 'pick') return true;
	return false;
};

/** After FS cloud — brief pause so outro / tir GPU can drop before overlay WebGL returns. */
export const buyBonusWarmAfterFeatureMs = () => (isPhoneForAtlasDownscale() ? 900 : 450);

/** Live overlay Application for Dev RAM framebuffer estimates (may be undefined). */
export const getBuyBonusSharedPixiApp = () => app;

const visualZoom = () =>
	typeof window === 'undefined' ? 1 : Math.max(1, window.visualViewport?.scale ?? 1);

/** Match former per-card SpinePlayer sharpness (device DPR, floor 2 on retina). */
const buyBonusHostResolution = () => {
	const dpr = typeof window === 'undefined' ? 2 : window.devicePixelRatio || 1;
	return Math.min(Math.max(dpr, 2), 3) / visualZoom();
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
			antialias: false,
			autoDensity: true,
			preference: 'webgl',
			powerPreference: 'high-performance',
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
		/* z-index via CSS per overlay — inline would pin canvas under pick card HTML. */
		next.canvas.setAttribute('aria-hidden', 'true');
		app = next;
		if (!tickerBound) {
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

/** Evict atlas + pages so a new overlay GL app cannot reuse dead GPU textures. */
const hardEvictBuyBonusVariantAssets = async (variant: BuyBonusSpineVariant) => {
	const urls = buyBonusSpineUrls(variant);
	const all = [urls.atlas, urls.skeleton, ...urls.images];
	// Stale Spine.from SkeletonData keeps pointers to destroyed atlas pages → black cards.
	evictCachedUrl(spineFromCacheKey(urls.skeleton, urls.atlas));
	if (variant === 'normal') {
		const mascot = buyBonusNormalMascotUrls();
		evictCachedUrl(spineFromCacheKey(mascot.skeleton, mascot.atlas));
	}
	for (const url of all) {
		try {
			if (!Cache.has(url)) continue;
			const asset = PIXI.Assets.get(url) as
				| TextureAtlas
				| PIXI.Texture
				| { destroy?: (n?: boolean) => void }
				| undefined;
			if (asset && 'pages' in asset && Array.isArray((asset as TextureAtlas).pages)) {
				for (const page of (asset as TextureAtlas).pages) {
					try {
						(page.texture as SpineTexture | null)?.texture?.destroy(true);
					} catch {
						/* already gone */
					}
				}
			} else if (asset && typeof (asset as PIXI.Texture).destroy === 'function') {
				try {
					(asset as PIXI.Texture).destroy(true);
				} catch {
					/* already gone */
				}
			}
		} catch {
			/* not in cache */
		}
	}
	try {
		await PIXI.Assets.unload(all);
	} catch {
		/* not cached */
	}
	for (const url of all) evictCachedUrl(url);
};

/**
 * Load atlas pages with explicit PMA-on-upload into THIS pass, then wire the atlas.
 * Avoids stale Cache TextureSources from a destroyed overlay WebGL (solid black cards).
 */
const loadBuyBonusAtlasAndSkeleton = async (variant: BuyBonusSpineVariant) => {
	const urls = buyBonusSpineUrls(variant);
	await withBuyBonusAssets(async () => {
		await hardEvictBuyBonusVariantAssets(variant);

		const images: Record<string, PIXI.TextureSource> = {};
		for (const url of urls.images) {
			const texture = (await PIXI.Assets.load({
				src: url,
				data: { alphaMode: 'premultiply-alpha-on-upload' },
			})) as PIXI.Texture;
			const file = url.replace(/^.*\//, '');
			texture.source.label = file;
			texture.source.autoGenerateMipmaps = false;
			if (texture.source.style) texture.source.style.scaleMode = 'linear';
			images[file] = texture.source;
		}

		await PIXI.Assets.load([{ src: urls.atlas, data: { images } }, urls.skeleton]);
		atlasesDirty = false;
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

const createFrameSpine = (
	variant: BuyBonusSpineVariant,
	urls: ReturnType<typeof buyBonusSpineUrls>,
) => {
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

/** Cache keys unique from main-game white/dog atlases (those live on another GL). */
const pickAtlasCacheKey = (species: BuyBonusPickSpecies) => `bb-overlay-pick-${species}-atlas`;
const pickSkeletonCacheKey = (species: BuyBonusPickSpecies) => `bb-overlay-pick-${species}-skel`;
const pickSkeletonDataCacheKey = (species: BuyBonusPickSpecies) =>
	`${pickSkeletonCacheKey(species)}-${pickAtlasCacheKey(species)}-1`;

const pickMascotUrls = (species: BuyBonusPickSpecies) => {
	const isDog = species === 'dog';
	return {
		skeleton: resolveMascotSpineUrl(isDog ? 'dog/mascot_dog.json' : 'white/mascot_cat.json'),
		atlas: resolveMascotSpineUrl(isDog ? 'dog/mascot_dog.atlas' : 'white/mascot_cat.atlas'),
		images: isDog
			? [
					resolveMascotSpineUrl('dog/mascot_dog.png'),
					resolveMascotSpineUrl('dog/mascot_dog_2.png'),
				]
			: [resolveMascotSpineUrl('white/mascot_cat.png')],
	};
};

const forceDropPickSpine = (species: BuyBonusPickSpecies) => {
	const spine = pickSpines.get(species);
	if (!spine) return;
	try {
		spine.destroy({ children: true, texture: false });
	} catch {
		/* already released */
	}
	pickSpines.delete(species);
};

const dropAllPickSpines = () => {
	for (const species of [...pickSpines.keys()]) forceDropPickSpine(species);
	pickLoading.clear();
};

const evictPickMascotCache = (species: BuyBonusPickSpecies) => {
	for (const key of [
		pickAtlasCacheKey(species),
		pickSkeletonCacheKey(species),
		pickSkeletonDataCacheKey(species),
	]) {
		try {
			if (!Cache.has(key)) continue;
			const asset = Cache.get(key) as TextureAtlas | { dispose?: () => void } | undefined;
			if (asset && 'pages' in asset && Array.isArray((asset as TextureAtlas).pages)) {
				for (const page of (asset as TextureAtlas).pages) {
					try {
						(page.texture as SpineTexture | null)?.texture?.destroy(true);
					} catch {
						/* already gone */
					}
				}
				try {
					(asset as TextureAtlas).dispose?.();
				} catch {
					/* already gone */
				}
			}
		} catch {
			/* not in cache */
		}
		evictCachedUrl(key);
	}
};

type PickMascotBuilt = {
	atlas: TextureAtlas;
	skeletonData: ReturnType<SkeletonJson['readSkeletonData']>;
};

/**
 * Overlay-only atlas pages (canvas copy → upload to THIS renderer) + SkeletonData.
 * No Assets.load / no shared main-game Cache keys — those bind to the wrong GL.
 */
const buildPickMascotSkeleton = async (
	species: BuyBonusPickSpecies,
	renderer: PIXI.Renderer,
): Promise<PickMascotBuilt> => {
	const urls = pickMascotUrls(species);
	evictPickMascotCache(species);

	const atlasText = await (await fetch(urls.atlas)).text();
	const atlas = new TextureAtlas(atlasText);
	const imageByFile = new Map(
		urls.images.map((url) => [url.replace(/^.*\//, '').split('?')[0]!, url] as const),
	);

	for (const page of atlas.pages) {
		const imgUrl = imageByFile.get(page.name);
		if (!imgUrl) throw new Error(`[buyBonus] pick atlas page missing image: ${page.name}`);
		const response = await fetch(imgUrl);
		if (!response.ok) throw new Error(`[buyBonus] pick image fetch failed: ${imgUrl}`);
		const bitmap = await createImageBitmap(await response.blob());
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const ctx = canvas.getContext('2d', { alpha: true });
		if (!ctx) {
			bitmap.close();
			throw new Error(`[buyBonus] pick canvas 2d unavailable: ${page.name}`);
		}
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(bitmap, 0, 0);
		bitmap.close();

		const texture = PIXI.Texture.from(canvas);
		texture.source.alphaMode = 'premultiply-alpha-on-upload';
		texture.source.autoGenerateMipmaps = true;
		texture.source.label = `bb-pick-${page.name}`;
		if (texture.source.style) texture.source.style.scaleMode = 'linear';
		try {
			renderer.texture.bind(texture.source);
		} catch {
			/* first draw will upload */
		}
		page.setTexture(SpineTexture.from(texture.source));
	}

	const skeletonJson = await (await fetch(urls.skeleton)).json();
	const parser = new SkeletonJson(new AtlasAttachmentLoader(atlas));
	parser.scale = 1;
	const skeletonData = parser.readSkeletonData(skeletonJson);
	return { atlas, skeletonData };
};

const loadPickMascot = (species: BuyBonusPickSpecies) => {
	const existing = pickSpines.get(species);
	if (existing && !existing.destroyed) return Promise.resolve(existing);
	if (existing) forceDropPickSpine(species);
	const pending = pickLoading.get(species);
	if (pending) return pending;

	const task = (async () => {
		if (!canOwnApp()) return null;
		const createdApp = await ensureApp();
		if (!createdApp) return null;
		const gen = appGen;
		let built: PickMascotBuilt;
		try {
			built = await withBuyBonusAssets(() => buildPickMascotSkeleton(species, createdApp.renderer));
		} catch (error) {
			console.error('[buyBonus] pick mascot load failed', species, error);
			return null;
		}
		if (!app || gen !== appGen || !canOwnApp()) return null;
		const already = pickSpines.get(species);
		if (already && !already.destroyed) return already;
		if (already) forceDropPickSpine(species);

		try {
			const spine = new Spine({ skeletonData: built.skeletonData, autoUpdate: false });
			spine.state.setAnimation(0, 'idle', true);
			if (species === 'cat') {
				try {
					spine.skeleton.setAttachment('smile', null);
				} catch {
					spine.skeleton.findSlot('smile')?.setAttachment(null);
				}
			}
			spine.update(0);
			spine.visible = false;
			createdApp.stage.addChild(spine);
			pickSpines.set(species, spine);
			return spine;
		} catch (error) {
			console.error('[buyBonus] pick Spine create failed', species, error);
			return null;
		}
	}).finally(() => {
		pickLoading.delete(species);
	});

	pickLoading.set(species, task);
	return task;
};

const reloadRegisteredPickMascots = async () => {
	const speciesNeeded = new Set<BuyBonusPickSpecies>();
	for (const view of views.values()) {
		if (view.kind === 'pick' && view.host.isConnected) speciesNeeded.add(view.species);
	}
	await Promise.all([...speciesNeeded].map((species) => loadPickMascot(species)));
};

/** Force cat+dog onto overlay GL. Call when duel pick opens. */
export const ensureBuyBonusPickMascotsReady = async () => {
	if (!canOwnApp()) return;
	cancelScheduledDestroy();
	dropAllPickSpines();
	evictPickMascotCache('cat');
	evictPickMascotCache('dog');
	const created = await ensureApp();
	if (!created || !canOwnApp()) return;
	await Promise.all([loadPickMascot('cat'), loadPickMascot('dog')]);
	if (!app || !canOwnApp()) return;
	flushBuyBonusSharedStage();
	requestAnimationFrame(() => {
		flushBuyBonusSharedStage();
		requestAnimationFrame(() => flushBuyBonusSharedStage());
	});
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
		const createdApp = await ensureApp();
		if (!createdApp) return null;
		const gen = appGen;
		const urls = buyBonusSpineUrls(variant);
		if (gen !== appGen) return null;

		const loadAssets = async () => {
			await loadBuyBonusAtlasAndSkeleton(variant);
			if (variant === 'normal') {
				const mascot = buyBonusNormalMascotUrls();
				// Shared with main-game white cat — never hard-destroy; just ensure loaded.
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
	if (app) releaseCpuTextureTwins(app);
};

export const areBuyBonusSpinesReady = (variants: readonly BuyBonusSpineVariant[] = MENU_VARIANTS) =>
	Boolean(app) &&
	variants.every((variant) => spines.has(variant) && variantTexturesLive(variant));

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

/**
 * One-shot: force overlay GL + atlases to rebuild (black-card / quality fixes).
 * Bump this when texture-load path changes so HMR/warm park cannot keep dead GPU pages.
 * v2: pick mascots use manual TextureAtlas Cache keys (not Assets.load aliases).
 */
let needsAtlasPmaRebuild = true;

/** Load on first Buy Bonus open; remount after FS. Never during a feature. */
export const ensureBuyBonusWarm = (): Promise<void> => {
	if (!canOwnApp()) return Promise.resolve();
	if (!needsAtlasPmaRebuild && areBuyBonusSpinesReady(MENU_VARIANTS)) {
		markBuyBonusWarmSucceeded();
		return Promise.resolve();
	}
	if (warmPromise) return warmPromise;

	warmPromise = (async () => {
		try {
			if (needsAtlasPmaRebuild) {
				needsAtlasPmaRebuild = false;
				for (const variant of MENU_VARIANTS) forceDropSpine(variant);
				dropAllPickSpines();
				// Recreate GL app (new resolution / AA) but keep registered HTML hosts.
				appGen += 1;
				atlasesDirty = true;
				const current = app;
				app = undefined;
				appReady = undefined;
				tickerBound = false;
				if (current) {
					current.ticker.remove(tickSharedStage);
					current.destroy(true);
				}
				await purgeBuyBonusAssetCache();
			}
			const createdApp = await ensureApp();
			if (!createdApp || !canOwnApp()) return;
			await whenBuyBonusSpinesReady(MENU_VARIANTS);
			await reloadRegisteredPickMascots();
			if (!app || !canOwnApp()) return;
			if (hasLiveView()) {
				flushBuyBonusSharedStage();
			} else {
				for (const spine of spines.values()) spine.visible = false;
				for (const spine of pickSpines.values()) spine.visible = false;
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
	// Pick layers: canvas above opaque card bg (clear pixels still show frame/text).
	// Buy-card layers: canvas under HTML text (cards are transparent over spine art).
	const isPickLayer = Boolean(layer.querySelector('[data-buy-bonus-pick-host]'));
	app.canvas.style.zIndex = isPickLayer ? '1' : '0';
	if (isPickLayer) {
		if (app.canvas.parentElement !== layer || layer.lastElementChild !== app.canvas) {
			layer.appendChild(app.canvas);
		}
	} else if (app.canvas.parentElement !== layer || layer.firstChild !== app.canvas) {
		layer.insertBefore(app.canvas, layer.firstChild);
	}
	observeLayer(layer);
};

const resizeCanvas = (layer: HTMLElement) => {
	if (!app) return;
	const zoom = visualZoom();
	const rect = layer.getBoundingClientRect();
	const w = Math.max(0, Math.round(rect.width / zoom));
	const h = Math.max(0, Math.round(rect.height / zoom));
	if (w < 2 || h < 2) return;
	const dpr = buyBonusHostResolution();
	if (app.renderer.resolution !== dpr) app.renderer.resolution = dpr;
	if (app.renderer.width !== w || app.renderer.height !== h) {
		app.renderer.resize(w, h);
	}
	app.canvas.style.width = `${w}px`;
	app.canvas.style.height = `${h}px`;
	app.canvas.style.left = '0';
	app.canvas.style.top = '0';
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

const layoutPickMascot = (
	spine: Spine,
	species: BuyBonusPickSpecies,
	host: HTMLElement,
	layer: HTMLElement,
	mirror: boolean,
) => {
	const zoom = visualZoom();
	const hostRect = host.getBoundingClientRect();
	const w = hostRect.width / zoom;
	const h = hostRect.height / zoom;
	if (w < 2 || h < 2) {
		spine.visible = false;
		return;
	}
	const viewport = species === 'dog' ? MASCOT_DOG_SPINE_VIEWPORT : MASCOT_SPINE_VIEWPORT;
	const transform = getMascotPixiTransform(
		{ left: 0, top: 0, width: w, height: h, bodyLeft: 0, bodyWidth: w },
		viewport,
	);
	const button = cardButton(host);
	spine.alpha = button?.disabled ? 0.5 : 1;
	spine.visible = true;
	const layerRect = layer.getBoundingClientRect();
	const sx = mirror ? -transform.scale : transform.scale;
	spine.scale.set(sx, transform.scale);
	spine.x = (hostRect.left - layerRect.left) / zoom + w * 0.5 + transform.spineX;
	spine.y = (hostRect.top - layerRect.top) / zoom + h * 0.5 + transform.spineY;
};

const CONFIRM_LAYER_ATTR = 'data-buy-bonus-confirm-layer';

const viewLayerOf = (host: HTMLElement): HTMLElement | null => {
	const confirm = host.closest(`[${CONFIRM_LAYER_ATTR}]`);
	if (confirm instanceof HTMLElement) return confirm;
	const menu = host.closest(LAYER_SELECTOR);
	return menu instanceof HTMLElement ? menu : null;
};

const pickLayer = (visible: OverlayView[]) => {
	// Active pick hosts first (buy choose-side / in-round duel pick).
	for (const view of visible) {
		if (!view.active || view.kind !== 'pick') continue;
		const layer = viewLayerOf(view.host);
		if (layer) return layer;
	}
	// Pick layer may be displayed before `playing` flips active — never let warm
	// buy-menu hosts (isDisplayed via data-buy-bonus-prepare) steal the canvas.
	for (const view of views.values()) {
		if (view.kind !== 'pick' || !view.host.isConnected) continue;
		const layer = viewLayerOf(view.host);
		if (layer && isDisplayed(layer)) return layer;
	}
	// Confirm host wins over warm-parked menu hosts (same variant, two layers).
	for (const view of visible) {
		if (!view.active) continue;
		const layer = view.host.closest(`[${CONFIRM_LAYER_ATTR}]`);
		if (layer instanceof HTMLElement) return layer;
	}
	for (const view of visible) {
		if (!view.active) continue;
		const layer = viewLayerOf(view.host);
		if (layer) return layer;
	}
	for (const view of visible) {
		const layer = viewLayerOf(view.host);
		if (layer) return layer;
	}
	return null;
};

let lastSpineAdvanceMs = 0;

const layoutAndDraw = (advance: boolean) => {
	if (!app) return;

	const visible: OverlayView[] = [];
	for (const view of views.values()) {
		if (!view.host.isConnected) continue;
		if (view.active || isDisplayed(view.host)) visible.push(view);
	}

	const layer = pickLayer(visible);
	if (!layer) {
		for (const spine of spines.values()) spine.visible = false;
		for (const spine of pickSpines.values()) spine.visible = false;
		lastSpineAdvanceMs = 0;
		app.ticker.stop();
		return;
	}

	attachCanvas(layer);
	resizeCanvas(layer);

	// Never layout warm-parked menu hosts into the confirm canvas (ghost duel/normal art).
	const layerViews = visible.filter((view) => viewLayerOf(view.host) === layer);
	const layerHasActive = layerViews.some((view) => view.active);

	const playing = layerViews.some((view) => view.active) && !isHtmlWebglPaused();
	let dt = 0;
	if (advance && playing) {
		const now = performance.now();
		dt = lastSpineAdvanceMs === 0 ? 0 : Math.min((now - lastSpineAdvanceMs) / 1000, 0.05);
		lastSpineAdvanceMs = now;
	} else if (!playing) {
		lastSpineAdvanceMs = 0;
	}

	const layerCards = layerViews.filter((v): v is CardView => v.kind === 'card');
	const layerPicks = layerViews.filter((v): v is PickView => v.kind === 'pick');

	for (const variant of spines.keys()) {
		const visual = spines.get(variant);
		if (!visual) continue;
		const candidates = layerCards.filter((item) => item.variant === variant);
		const view =
			candidates.find((item) => item.active) ??
			(layerHasActive ? undefined : candidates[0]);
		if (!view) {
			visual.visible = false;
			continue;
		}
		layoutSpine(visual, variant, view.host, layer);
		if (dt > 0 && view.active) {
			forEachCardSpine(visual, (spine) => spine.update(dt));
		}
	}

	for (const species of pickSpines.keys()) {
		const spine = pickSpines.get(species);
		if (!spine) continue;
		const candidates = layerPicks.filter((item) => item.species === species);
		const view =
			candidates.find((item) => item.active) ??
			candidates.find((item) => isDisplayed(item.host)) ??
			(layerHasActive ? undefined : candidates[0]);
		if (!view) {
			spine.visible = false;
			continue;
		}
		layoutPickMascot(spine, species, view.host, layer, view.mirror);
		if (dt > 0 && (view.active || isDisplayed(view.host))) spine.update(dt);
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

/** Delay Assets.unload / shared-stage destroy so buy-spin + cat-slow are not hitched. */
const buyBonusHeavyTeardownDeferMs = () => (isPhoneForAtlasDownscale() ? 2200 : 1200);

let deferredHeavyTeardownTimer: ReturnType<typeof setTimeout> | undefined;
let deferredHeavyTeardownRaf = 0;

const cancelDeferredHeavyTeardown = () => {
	if (deferredHeavyTeardownTimer !== undefined) {
		clearTimeout(deferredHeavyTeardownTimer);
		deferredHeavyTeardownTimer = undefined;
	}
	if (deferredHeavyTeardownRaf) {
		cancelAnimationFrame(deferredHeavyTeardownRaf);
		deferredHeavyTeardownRaf = 0;
	}
};

/**
 * Soft-lock warm + stop card GPU; schedule heavy GL dispose / Assets.unload after
 * the buy-spin has started (avoids main-thread hitch during cat-slow).
 * Safe to call without await — sync work is only the lock + stopRendering.
 */
export const evictBuyBonusForFeature = () => {
	setFeatureEvictLock(true);
	cancelScheduledDestroy();
	cancelDeferredHeavyTeardown();
	gameEntrance.buyBonusPanelReady = false;
	gameEntrance.buyBonusWarmReady = false;

	// 2 rAF: modal unmount + bet tick first; then drop spines; unload later.
	deferredHeavyTeardownRaf = requestAnimationFrame(() => {
		deferredHeavyTeardownRaf = requestAnimationFrame(() => {
			deferredHeavyTeardownRaf = 0;
			releaseAllBuyBonusCardSpinePlayers();
			releaseBuyBonusNormalStreetStill();
			deferredHeavyTeardownTimer = setTimeout(() => {
				deferredHeavyTeardownTimer = undefined;
				// Warm remount cleared the lock — do not purge atlases under a new park.
				if (!getFeatureEvictLock()) return;
				void destroySharedStageAsync();
			}, buyBonusHeavyTeardownDeferMs());
		});
	});
};

export const isBuyBonusFeatureEvictLocked = () => getFeatureEvictLock();

export const clearBuyBonusFeatureEvictLock = () => {
	cancelDeferredHeavyTeardown();
	setFeatureEvictLock(false);
};

const teardownSharedStageSync = () => {
	cancelScheduledDestroy();
	appGen += 1;
	atlasesDirty = true;
	// Next warm must rebuild GL + atlases (PMA upload into the new context).
	needsAtlasPmaRebuild = true;
	evictBuyBonusSpineFromCache();
	const inflight = [...loading.values(), ...pickLoading.values()];
	for (const visual of spines.values()) {
		try {
			visual.destroy({ children: true, texture: false });
		} catch {
			/* already released */
		}
	}
	spines.clear();
	loading.clear();
	for (const spine of pickSpines.values()) {
		try {
			spine.destroy({ children: true, texture: false });
		} catch {
			/* already released */
		}
	}
	pickSpines.clear();
	pickLoading.clear();
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
	if (loading.size > 0 || pickLoading.size > 0 || hasLiveView()) return;
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
	views.set(id, { id, kind: 'card', variant, host, active });
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
		const load =
			view.kind === 'card' ? loadSpine(view.variant) : loadPickMascot(view.species);
		void load.then(() => {
			if (views.has(id)) requestSync();
		});
	});
};

export const unregisterBuyBonusCardView = (id: BuyBonusCardViewId) => {
	views.delete(id);
	if (views.size === 0 || !hasLiveView()) {
		if (app?.ticker.started) app.ticker.stop();
		for (const spine of spines.values()) spine.visible = false;
		for (const spine of pickSpines.values()) spine.visible = false;
		if (!shouldKeepBuyBonusWarm()) scheduleDestroyIfIdle();
		return;
	}
	requestSync();
};

export const registerBuyBonusPickMascotView = (
	species: BuyBonusPickSpecies,
	host: HTMLElement,
	active: boolean,
	mirror = false,
): BuyBonusCardViewId => {
	const id = nextViewId;
	nextViewId += 1;
	views.set(id, { id, kind: 'pick', species, host, active, mirror });
	if (!canOwnApp()) return id;
	cancelScheduledDestroy();
	void ensureApp().then((created) => {
		if (!created || !views.has(id) || !canOwnApp()) return;
		void loadPickMascot(species).then(() => {
			if (views.has(id)) requestSync();
		});
	});
	return id;
};

export const setBuyBonusPickMascotViewActive = (id: BuyBonusCardViewId, active: boolean) => {
	setBuyBonusCardViewActive(id, active);
};

export const unregisterBuyBonusPickMascotView = (id: BuyBonusCardViewId) => {
	unregisterBuyBonusCardView(id);
};
