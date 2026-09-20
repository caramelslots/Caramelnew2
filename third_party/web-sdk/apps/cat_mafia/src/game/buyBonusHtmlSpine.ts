/** designer_assets buy-bonus card spines — Pixi overlay (not HTML SpinePlayer). */

import { isPhoneForAtlasDownscale } from './phoneSpineAtlasDownscale';

export type BuyBonusSpineVariant = 'normal' | 'super' | 'duel';

export type BuyBonusSpineViewport = {
	x: number;
	y: number;
	width: number;
	height: number;
};

const assetUrl = (path: string) =>
	new URL(
		path.replace(/^\//, ''),
		typeof window !== 'undefined' ? window.location.href : import.meta.url,
	).href;

const spineDir = (variant: BuyBonusSpineVariant) => `assets/spines/buyBonus/${variant}`;

/**
 * Card-frame cameras in skeleton Y-up.
 * Region is frame ∪ price hex — the hex hangs below the frame attachment,
 * so a frame-only camera clipped the gold buttons.
 * Size is attachment × bone world scale (normal_frame 5.295, wild_frame 1.495,
 * duel_frame ∪ button after idle_duel — hats may peek above the gold trim).
 */
export const BUY_BONUS_SPINE_VIEWPORTS = {
	normal: { x: -1165.406, y: -421.917, width: 2324.577, height: 3321.756 },
	/** Frame ∪ price button after `idle_bonus` (wild_frame scale ≈0.67). */
	super: { x: -304.913, y: -787.396, width: 439.0, height: 627.424 },
	/** Frame ∪ price button from `export_cat&dog` idle_duel (tight crop = larger on card). */
	duel: { x: -2207.0, y: 440.0, width: 4230.0, height: 1480.0 },
} as const satisfies Record<BuyBonusSpineVariant, BuyBonusSpineViewport>;

export const BUY_BONUS_SPINE_ANIM: Record<BuyBonusSpineVariant, string> = {
	normal: 'idle_bonusnormal',
	super: 'idle_bonus',
	duel: 'idle_duel',
};

export const BUY_BONUS_SPINE_FILES: Record<
	BuyBonusSpineVariant,
	{ json: string; atlas: string; images: readonly string[] }
> = {
	normal: {
		json: 'bonus_normal.json',
		atlas: 'bonus_normal.atlas',
		images: ['bonus_normal.webp'],
	},
	super: {
		json: 'WILD_F_1.json',
		atlas: 'WILD_F_1.atlas',
		images: ['WILD_F_1.webp', 'WILD_F_1_2.webp'],
	},
	/** Full baked cat+dog card from designer_assets/export_cat&dog. */
	duel: {
		json: 'mascot_cat.json',
		atlas: 'mascot_cat.atlas',
		images: ['mascot_cat.webp', 'mascot_cat_2.webp', 'mascot_cat_3.webp'],
	},
};

export const resolveBuyBonusSpineUrl = (variant: BuyBonusSpineVariant, file: string) =>
	assetUrl(`${spineDir(variant)}/${file}`);

export const buyBonusSpineUrls = (variant: BuyBonusSpineVariant) => {
	const files = BUY_BONUS_SPINE_FILES[variant];
	return {
		skeleton: resolveBuyBonusSpineUrl(variant, files.json),
		atlas: resolveBuyBonusSpineUrl(variant, files.atlas),
		images: files.images.map((file) => resolveBuyBonusSpineUrl(variant, file)),
	};
};

/** Shared white mascot (same files as main-screen `mascotCat`) — not under buyBonus/normal. */
export const BUY_BONUS_NORMAL_MASCOT_FILES = {
	json: 'white/mascot_cat.json',
	atlas: 'white/mascot_cat.atlas',
	images: ['white/mascot_cat.png'],
} as const;

export const BUY_BONUS_NORMAL_MASCOT_ANIM = 'idle';

const mascotAssetUrl = (file: string) => assetUrl(`assets/spines/mascot/${file}`);

export const buyBonusNormalMascotUrls = () => ({
	skeleton: mascotAssetUrl(BUY_BONUS_NORMAL_MASCOT_FILES.json),
	atlas: mascotAssetUrl(BUY_BONUS_NORMAL_MASCOT_FILES.atlas),
	images: BUY_BONUS_NORMAL_MASCOT_FILES.images.map(mascotAssetUrl),
});

export const BUY_BONUS_SPINE_IMAGE_URLS = (
	['normal', 'super', 'duel'] as const satisfies readonly BuyBonusSpineVariant[]
).flatMap((variant) => buyBonusSpineUrls(variant).images);

/** Designer reference stills baked into the export — hide at runtime. */
export const BUY_BONUS_HIDDEN_SLOTS: Record<BuyBonusSpineVariant, readonly string[]> = {
	/** New normal export is frame-only — mascot comes from shared white spine. */
	normal: [],
	/** New wild_superbonus export is self-contained — no reference still. */
	super: [],
	duel: [],
};

/**
 * Fit the card-frame viewport into a Pixi host.
 * spine-pixi maps skeleton Y-up → Pixi Y-down — same offset as mascot / SW.
 */
export const getBuyBonusPixiTransform = (
	variant: BuyBonusSpineVariant,
	boxWidth: number,
	boxHeight: number,
) => {
	const vp = BUY_BONUS_SPINE_VIEWPORTS[variant];
	const pad = 0.015;
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

/** HTTP warm-up only — do not PIXI.Assets.load here (textures must bind to the overlay renderer). */
export const preloadBuyBonusSpines = async () => {
	if (typeof window === 'undefined') return;
	const urls = (['normal', 'super', 'duel'] as const).flatMap((variant) => {
		const files = buyBonusSpineUrls(variant);
		return [files.atlas, files.skeleton, ...files.images];
	});
	const normalMascot = buyBonusNormalMascotUrls();
	urls.push(normalMascot.atlas, normalMascot.skeleton, ...normalMascot.images);
	await Promise.all(urls.map((url) => fetch(url).catch(() => null)));
};

const buyBonusSpineBitmaps = new Map<string, ImageBitmap>();
let bitmapDecodePromise: Promise<void> | null = null;
let bitmapDecodeEpoch = 0;
/** Feature / tir must not re-decode 4K pages into RAM. */
let bitmapDecodeAllowed = true;

const uniqueBuyBonusSpineImageUrls = () => [...new Set(BUY_BONUS_SPINE_IMAGE_URLS)];

const yieldFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const decodeBuyBonusSpineBitmap = async (url: string, epoch: number) => {
	if (epoch !== bitmapDecodeEpoch || buyBonusSpineBitmaps.has(url)) return;
	const response = await fetch(url);
	if (!response.ok) return;
	const blob = await response.blob();
	if (epoch !== bitmapDecodeEpoch) return;
	const bitmap = await createImageBitmap(blob);
	if (epoch !== bitmapDecodeEpoch) {
		bitmap.close();
		return;
	}
	const previous = buyBonusSpineBitmaps.get(url);
	if (previous && previous !== bitmap) previous.close();
	buyBonusSpineBitmaps.set(url, bitmap);
};

/**
 * CPU-decode atlas pages during the loader cards idle screen.
 * No WebGL — overlay `loadSpine` only uploads after `ensureApp`.
 * Fire-and-forget: do not await from Continue / `startBuyBonusFlowPreload`.
 */
export const startBuyBonusSpineBitmapDecode = (): Promise<void> => {
	if (typeof window === 'undefined' || typeof createImageBitmap !== 'function') {
		return Promise.resolve();
	}
	if (!bitmapDecodeAllowed) return Promise.resolve();
	if (bitmapDecodePromise) return bitmapDecodePromise;

	const urls = uniqueBuyBonusSpineImageUrls();
	if (urls.every((url) => buyBonusSpineBitmaps.has(url))) return Promise.resolve();

	const epoch = bitmapDecodeEpoch;
	bitmapDecodePromise = (async () => {
		if (isPhoneForAtlasDownscale()) {
			for (const url of urls) {
				if (epoch !== bitmapDecodeEpoch) return;
				try {
					await decodeBuyBonusSpineBitmap(url, epoch);
				} catch {
					/* keep going — overlay loadSpine falls back to Assets.load */
				}
				await yieldFrame();
			}
			return;
		}
		await Promise.all(
			urls.map((url) => decodeBuyBonusSpineBitmap(url, epoch).catch(() => undefined)),
		);
	})();

	return bitmapDecodePromise;
};

export const getBuyBonusSpineBitmap = (url: string) => buyBonusSpineBitmaps.get(url);

/** Drop decoded pages after GPU upload (phone compact) or overlay teardown. */
export const releaseBuyBonusSpineBitmaps = (urls?: readonly string[]) => {
	const targets = urls ?? [...buyBonusSpineBitmaps.keys()];
	for (const url of targets) {
		const bitmap = buyBonusSpineBitmaps.get(url);
		buyBonusSpineBitmaps.delete(url);
		if (!bitmap) continue;
		try {
			bitmap.close();
		} catch {
			/* already closed */
		}
	}
	if (!urls) {
		bitmapDecodeEpoch += 1;
		bitmapDecodePromise = null;
	}
};

export const resumeBuyBonusSpineBitmapDecode = () => {
	bitmapDecodeAllowed = true;
};

/** Stop CPU decode and drop bitmaps while a feature owns VRAM. */
export const suspendBuyBonusSpineBitmapDecode = () => {
	bitmapDecodeAllowed = false;
	releaseBuyBonusSpineBitmaps();
};
