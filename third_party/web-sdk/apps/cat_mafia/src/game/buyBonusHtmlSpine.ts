/** designer_assets buy-bonus card spines — Pixi overlay (not HTML SpinePlayer). */

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
 * duel_frame 1.27 after idle_duel).
 */
export const BUY_BONUS_SPINE_VIEWPORTS = {
	normal: { x: -1165.406, y: -421.917, width: 2324.577, height: 3321.756 },
	super: { x: -413.498, y: -949.865, width: 656.171, height: 937.807 },
	duel: { x: -2221.563, y: 435.74, width: 4230.185, height: 1436.382 },
} as const satisfies Record<BuyBonusSpineVariant, BuyBonusSpineViewport>;

export const BUY_BONUS_SPINE_ANIM: Record<BuyBonusSpineVariant, string> = {
	normal: 'idle_bonus',
	super: 'idle_bonus',
	duel: 'idle_duel',
};

export const BUY_BONUS_SPINE_FILES: Record<
	BuyBonusSpineVariant,
	{ json: string; atlas: string; images: readonly string[] }
> = {
	normal: {
		json: 'mascot_cat.json',
		atlas: 'mascot_cat.atlas',
		images: ['mascot_cat.webp', 'mascot_cat_2.webp'],
	},
	super: {
		json: 'WILD_F_1.json',
		atlas: 'WILD_F_1.atlas',
		images: ['WILD_F_1.webp', 'WILD_F_1_2.webp'],
	},
	duel: {
		json: 'mascot_cat.json',
		atlas: 'mascot_cat.atlas',
		images: ['mascot_cat.webp', 'mascot_cat_2.webp'],
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

export const BUY_BONUS_SPINE_IMAGE_URLS = (
	['normal', 'super', 'duel'] as const satisfies readonly BuyBonusSpineVariant[]
).flatMap((variant) => buyBonusSpineUrls(variant).images);

/** Designer reference stills baked into the export — hide at runtime. */
export const BUY_BONUS_HIDDEN_SLOTS: Record<BuyBonusSpineVariant, readonly string[]> = {
	normal: ['photo_2026-09-07_18-01-43'],
	super: ['photo_2026-09-07_18-56-25'],
	duel: ['photo_2026-09-07_16-38-24'],
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
	await Promise.all(urls.map((url) => fetch(url).catch(() => null)));
};
