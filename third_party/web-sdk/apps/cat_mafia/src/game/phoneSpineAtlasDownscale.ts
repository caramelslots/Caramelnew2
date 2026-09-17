/**
 * Phone VRAM relief (plan п.10, variant B): after load, replace oversized Spine
 * atlas GPU textures with downscaled canvases. Atlas page.width/height and
 * region UVs stay as authored — only the bitmap shrinks (slightly softer).
 *
 * Not a +FPS lever; goal is lower peak VRAM before Stage E hit.
 */

import { Assets, Texture } from 'pixi.js';
import type { TextureAtlas, TextureAtlasPage, TextureAtlasRegion } from '@esotericsoftware/spine-core';
import { SpineTexture } from '@esotericsoftware/spine-pixi-v8';

import assets from './assets';

/** Longest edge allowed on phone for the heaviest atlases (board 4K → 2K). */
export const PHONE_SPINE_ATLAS_MAX_EDGE = 2048;
/** Tighter cap for already-2K symbol pages (H1 / cartridge). */
export const PHONE_SPINE_ATLAS_MAX_EDGE_TIGHT = 1024;

type AtlasCap = { assetKey: string; maxEdge: number };

const PHONE_ATLAS_CAPS: readonly AtlasCap[] = [
	{ assetKey: 'boardFrame', maxEdge: PHONE_SPINE_ATLAS_MAX_EDGE },
	{ assetKey: 'mainBackground', maxEdge: PHONE_SPINE_ATLAS_MAX_EDGE },
	/** Tir flip shares the 4K target_board atlas — cap before Stage E hit. */
	{ assetKey: 'targetBoardFlip', maxEdge: PHONE_SPINE_ATLAS_MAX_EDGE },
	{ assetKey: 'H1', maxEdge: PHONE_SPINE_ATLAS_MAX_EDGE_TIGHT },
	{ assetKey: 'cartridge', maxEdge: PHONE_SPINE_ATLAS_MAX_EDGE_TIGHT },
	/**
	 * Extra-FS peak: WILD_F_1 is 1885×1667 (under 2048, so the board cap is a no-op).
	 * Same atlas as `W` — one key is enough; UV/layout unchanged, slightly softer on phone.
	 */
	{ assetKey: 'superWildCurtain', maxEdge: PHONE_SPINE_ATLAS_MAX_EDGE_TIGHT },
];

export const isPhoneForAtlasDownscale = () => {
	if (typeof window === 'undefined') return false;
	const minSide = Math.min(window.innerWidth, window.innerHeight);
	const touch = navigator.maxTouchPoints > 0;
	const ua = navigator.userAgent;
	const mobileUa = /iPhone|iPod|Android.*Mobile|Mobile.*Android/i.test(ua);
	return mobileUa || (touch && minSide <= 500);
};

const atlasPageFileNames = (atlasText: string): string[] => {
	const files: string[] = [];
	for (const raw of atlasText.split(/\r?\n/)) {
		const line = raw.trim();
		if (/^(?:.*\/)?[^:\s]+\.(webp|png|jpe?g)$/i.test(line)) files.push(line);
	}
	return files;
};

const resolveAtlasPageUrl = (atlasUrl: string, file: string) => {
	if (/^[a-z]+:/i.test(file) || file.startsWith('/')) return file;
	const slash = atlasUrl.lastIndexOf('/');
	return `${slash >= 0 ? atlasUrl.slice(0, slash + 1) : ''}${file}`;
};

const decodeImageToCanvas = async (url: string, maxEdge: number): Promise<HTMLCanvasElement> => {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`atlas page fetch failed: ${url}`);
	const blob = await response.blob();
	let source: CanvasImageSource;
	let width: number;
	let height: number;
	let close: (() => void) | undefined;
	if (typeof createImageBitmap === 'function') {
		const bitmap = await createImageBitmap(blob);
		source = bitmap;
		width = bitmap.width;
		height = bitmap.height;
		close = () => bitmap.close();
	} else {
		const img = new Image();
		const objectUrl = URL.createObjectURL(blob);
		try {
			await new Promise<void>((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error(`atlas page decode failed: ${url}`));
				img.src = objectUrl;
			});
			if (typeof img.decode === 'function') await img.decode().catch(() => undefined);
		} finally {
			URL.revokeObjectURL(objectUrl);
		}
		source = img;
		width = img.naturalWidth;
		height = img.naturalHeight;
	}
	const edge = Math.max(width, height);
	const scale = edge > maxEdge ? maxEdge / edge : 1;
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.round(width * scale));
	canvas.height = Math.max(1, Math.round(height * scale));
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		close?.();
		throw new Error('atlas page canvas 2d unavailable');
	}
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
	close?.();
	return canvas;
};

/**
 * Decode atlas pages on CPU and upload already-capped bitmaps.
 * Avoids the 4K GPU spike of Assets.load → downscale → destroy.
 */
export const prepareCappedAtlasImageSources = async (
	atlasUrl: string,
	maxEdge: number,
): Promise<Record<string, Texture['source']> | null> => {
	if (typeof window === 'undefined') return null;
	try {
		const atlasText = await fetch(atlasUrl).then((res) => {
			if (!res.ok) throw new Error(`atlas fetch failed: ${atlasUrl}`);
			return res.text();
		});
		const files = atlasPageFileNames(atlasText);
		if (files.length === 0) return null;
		const images: Record<string, Texture['source']> = {};
		for (const file of files) {
			const canvas = await decodeImageToCanvas(resolveAtlasPageUrl(atlasUrl, file), maxEdge);
			images[file] = Texture.from(canvas).source;
		}
		return images;
	} catch {
		return null;
	}
};

const atlasUrlForAssetKey = (assetKey: string): string | null => {
	const entry = (assets as Record<string, { type?: string; src?: { atlas?: string } }>)[assetKey];
	if (!entry || entry.type !== 'spine' || typeof entry.src?.atlas !== 'string') return null;
	return entry.src.atlas;
};

const asCanvasImageSource = (resource: unknown): CanvasImageSource | null => {
	if (!resource || typeof resource !== 'object') return null;
	if (resource instanceof HTMLImageElement) return resource;
	if (resource instanceof HTMLCanvasElement) return resource;
	if (typeof ImageBitmap !== 'undefined' && resource instanceof ImageBitmap) return resource;
	if (typeof OffscreenCanvas !== 'undefined' && resource instanceof OffscreenCanvas) return resource;
	return null;
};

/**
 * Super-card spine is the full SW feature rig. Menu only needs the portrait:
 * cat + WILD banner + frame. Rays / wheel / arch / glows stay off GPU.
 */
export const isBuyBonusKeptAtlasRegion = (name: string) =>
	!/glow|rays|Circle_rays|^arch$|^wheel$|sector|^pointer$|^clip$|gradient|photo_/i.test(
		name,
	) && name !== 'background';

const packedRegionSize = (region: TextureAtlasRegion) => {
	const rot90 = region.degrees === 90;
	return {
		w: Math.max(1, Math.round(rot90 ? region.height : region.width)),
		h: Math.max(1, Math.round(rot90 ? region.width : region.height)),
	};
};

const liftRegionNative = (
	atlas: TextureAtlas,
	page: TextureAtlasPage,
	region: TextureAtlasRegion,
	img: CanvasImageSource,
	srcW: number,
	srcH: number,
): boolean => {
	const { w: packedW, h: packedH } = packedRegionSize(region);
	const sx = Math.max(0, Math.round(region.x));
	const sy = Math.max(0, Math.round(region.y));
	const sw = Math.min(packedW, srcW - sx);
	const sh = Math.min(packedH, srcH - sy);
	if (sw < 2 || sh < 2) return false;
	const canvas = document.createElement('canvas');
	canvas.width = sw;
	canvas.height = sh;
	const ctx = canvas.getContext('2d');
	if (!ctx) return false;
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
	const next = Texture.from(canvas);
	const Page = page.constructor as new (name: string) => TextureAtlasPage;
	const sharpPage = new Page(`${page.name}:${region.name}`);
	sharpPage.width = sw;
	sharpPage.height = sh;
	sharpPage.minFilter = page.minFilter;
	sharpPage.magFilter = page.magFilter;
	sharpPage.uWrap = page.uWrap;
	sharpPage.vWrap = page.vWrap;
	sharpPage.pma = page.pma;
	sharpPage.regions.push(region);
	sharpPage.setTexture(SpineTexture.from(next.source));
	atlas.pages.push(sharpPage);
	region.page = sharpPage;
	region.x = 0;
	region.y = 0;
	region.u = 0;
	region.v = 0;
	region.u2 = 1;
	region.v2 = 1;
	return true;
};

/** Lift kept buy-bonus regions at native size; drop FX pages (4K wheel/rays/arch). */
export const compactBuyBonusAtlas = (atlas: TextureAtlas): number => {
	let changed = 0;
	const empty = document.createElement('canvas');
	empty.width = 1;
	empty.height = 1;
	const emptyTex = Texture.from(empty);

	for (const page of [...atlas.pages]) {
		if (page.name.includes(':')) continue;
		const spineTex = page.texture as SpineTexture | null;
		const pixiTex = spineTex?.texture;
		const source = pixiTex?.source;
		if (!source) continue;
		const img = asCanvasImageSource(source.resource);
		if (!img) continue;
		const w = source.width;
		const h = source.height;
		const leftover: TextureAtlasRegion[] = [];
		for (const region of page.regions) {
			if (!isBuyBonusKeptAtlasRegion(region.name) || !liftRegionNative(atlas, page, region, img, w, h)) {
				leftover.push(region);
			}
		}
		page.regions.length = 0;
		page.regions.push(...leftover);
		page.setTexture(SpineTexture.from(emptyTex.source));
		try {
			pixiTex.destroy(true);
		} catch {
			/* GPU already released */
		}
		changed += 1;
	}
	return changed;
};

export const compactBuyBonusAtlasByUrl = (atlasUrl: string): number => {
	let atlas: TextureAtlas | undefined;
	try {
		atlas = Assets.get(atlasUrl) as TextureAtlas | undefined;
	} catch {
		return 0;
	}
	if (!atlas?.pages?.length) return 0;
	return compactBuyBonusAtlas(atlas);
};

/** Returns the number of page textures replaced. */
export const downscaleSpineAtlasPageTexture = (
	atlas: TextureAtlas,
	maxEdge: number,
): number => {
	let changed = 0;
	for (const page of atlas.pages) {
		const spineTex = page.texture as SpineTexture | null;
		const pixiTex = spineTex?.texture;
		const source = pixiTex?.source;
		if (!source) continue;

		const w = source.width;
		const h = source.height;
		const edge = Math.max(w, h);
		if (edge <= maxEdge) continue;

		const scale = maxEdge / edge;
		const nw = Math.max(1, Math.round(w * scale));
		const nh = Math.max(1, Math.round(h * scale));
		const img = asCanvasImageSource(source.resource);
		if (!img) continue;

		const canvas = document.createElement('canvas');
		canvas.width = nw;
		canvas.height = nh;
		const ctx = canvas.getContext('2d');
		if (!ctx) continue;
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(img, 0, 0, nw, nh);

		const next = Texture.from(canvas);
		page.setTexture(SpineTexture.from(next.source));
		try {
			pixiTex.destroy(true);
		} catch {
			/* GPU already released */
		}
		changed += 1;
	}
	return changed;
};

export const PHONE_BUY_BONUS_ATLAS_MAX_EDGE = PHONE_SPINE_ATLAS_MAX_EDGE_TIGHT;

/** Downscale a Spine atlas already in `Assets` by URL. */
export const downscaleSpineAtlasByUrl = (atlasUrl: string, maxEdge: number): number => {
	let atlas: TextureAtlas | undefined;
	try {
		atlas = Assets.get(atlasUrl) as TextureAtlas | undefined;
	} catch {
		return 0;
	}
	if (!atlas?.pages?.length) return 0;
	return downscaleSpineAtlasPageTexture(atlas, maxEdge);
};

export const downscalePhoneSpineAtlases = (): { pages: number; atlases: number } => {
	if (!isPhoneForAtlasDownscale()) return { pages: 0, atlases: 0 };

	let pages = 0;
	let atlases = 0;
	for (const { assetKey, maxEdge } of PHONE_ATLAS_CAPS) {
		const url = atlasUrlForAssetKey(assetKey);
		if (!url) continue;
		const n = downscaleSpineAtlasByUrl(url, maxEdge);
		if (n > 0) {
			pages += n;
			atlases += 1;
		}
	}
	return { pages, atlases };
};
