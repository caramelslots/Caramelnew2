/**
 * Phone VRAM relief (plan п.10, variant B): after load, replace oversized Spine
 * atlas GPU textures with downscaled canvases. Atlas page.width/height and
 * region UVs stay as authored — only the bitmap shrinks (slightly softer).
 *
 * Not a +FPS lever; goal is lower peak VRAM before Stage E hit.
 */

import { Assets, Texture } from 'pixi.js';
import type { TextureAtlas } from '@esotericsoftware/spine-core';
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
];

export const isPhoneForAtlasDownscale = () => {
	if (typeof window === 'undefined') return false;
	const minSide = Math.min(window.innerWidth, window.innerHeight);
	const touch = navigator.maxTouchPoints > 0;
	const ua = navigator.userAgent;
	const mobileUa = /iPhone|iPod|Android.*Mobile|Mobile.*Android/i.test(ua);
	return mobileUa || (touch && minSide <= 500);
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

/** Returns true if the page texture was replaced. */
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

export const downscalePhoneSpineAtlases = (): { pages: number; atlases: number } => {
	if (!isPhoneForAtlasDownscale()) return { pages: 0, atlases: 0 };

	let pages = 0;
	let atlases = 0;
	for (const { assetKey, maxEdge } of PHONE_ATLAS_CAPS) {
		const url = atlasUrlForAssetKey(assetKey);
		if (!url) continue;
		let atlas: TextureAtlas | undefined;
		try {
			atlas = Assets.get(url) as TextureAtlas | undefined;
		} catch {
			continue;
		}
		if (!atlas?.pages?.length) continue;
		const n = downscaleSpineAtlasPageTexture(atlas, maxEdge);
		if (n > 0) {
			pages += n;
			atlases += 1;
		}
	}
	return { pages, atlases };
};
