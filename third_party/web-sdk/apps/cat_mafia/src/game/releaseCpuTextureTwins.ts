/**
 * Drop CPU-side ImageBitmap / HTMLImage twins after pixels are on the GPU.
 * Pixi keeps `TextureSource.resource` forever by default → ~2× system RAM for atlases.
 *
 * ⚠️ DISABLED for main-game assets: Pixi texture GC can unload rarely-drawn GPU
 * pages (spin WebPs, transition, fonts, FS barrel). Re-upload then needs
 * `resource`; if we nulled it, those assets render blank.
 *
 * Safe scoped path: `releaseCpuTwinsForUrls` — only named Asset URLs (tir cabinet /
 * tir spines). Never walk the whole Cache.
 *
 * Overlay apps (`{ force: true }`) may release twins — but ONLY from that app's
 * `renderer.texture.managedTextures`. Never walk the global Assets `Cache`:
 * buy-bonus and main share the same Cache, so a Cache sweep blanks transition,
 * meowfia fonts, and revolver sprites after the buy menu warms.
 *
 * Do not release HTMLCanvasElement resources — CanvasText / feather masks still mutate them.
 */

import { Assets, Cache, Texture, TextureSource, type Application } from 'pixi.js';
import { SpineTexture } from '@esotericsoftware/spine-pixi-v8';

const isCloseableBitmap = (resource: unknown): resource is ImageBitmap =>
	typeof ImageBitmap !== 'undefined' && resource instanceof ImageBitmap;

const isStaticCpuImage = (resource: unknown): boolean => {
	if (isCloseableBitmap(resource)) return true;
	if (typeof HTMLImageElement !== 'undefined' && resource instanceof HTMLImageElement) return true;
	return false;
};

/** Only textures uploaded to this app's GL — never the shared Assets Cache. */
const collectAppManagedSources = (app?: Application | null): TextureSource[] => {
	const managed = (
		app?.renderer as unknown as { texture?: { managedTextures?: TextureSource[] } } | undefined
	)?.texture?.managedTextures;
	if (!Array.isArray(managed)) return [];
	return managed.filter((source): source is TextureSource => Boolean(source && !source.destroyed));
};

const collectSourcesFromAsset = (into: Map<number, TextureSource>, value: unknown) => {
	if (!value || typeof value !== 'object') return;

	if (value instanceof TextureSource) {
		if (!value.destroyed) into.set(value.uid, value);
		return;
	}
	if (value instanceof Texture) {
		const source = value.source;
		if (source && !source.destroyed) into.set(source.uid, source);
		return;
	}

	const anyVal = value as Record<string, unknown>;
	if (Array.isArray(anyVal.pages)) {
		for (const page of anyVal.pages) {
			const spineTex = (page as { texture?: SpineTexture | null })?.texture;
			const pixiTex = spineTex?.texture;
			if (pixiTex?.source && !pixiTex.source.destroyed) {
				into.set(pixiTex.source.uid, pixiTex.source);
			}
		}
		return;
	}
	if (anyVal.texture) collectSourcesFromAsset(into, anyVal.texture);
	if (anyVal.source && anyVal.source instanceof TextureSource) {
		collectSourcesFromAsset(into, anyVal.source);
	}
};

export type ReleaseCpuTwinOptions = {
	/**
	 * Actually drop CPU twins. Default false — main slot must keep resources so
	 * texture GC can re-upload spin sprites / rarely drawn atlases.
	 */
	force?: boolean;
};

/** Force GPU upload then drop the CPU decode twin. */
export const releaseTextureSourceCpuTwin = (
	source: TextureSource,
	app?: Application | null,
): boolean => {
	if (!source || source.destroyed) return false;
	const resource = source.resource;
	if (!isStaticCpuImage(resource)) return false;

	if (app?.renderer) {
		try {
			(
				app.renderer as unknown as { texture?: { bind?: (s: TextureSource) => void } }
			).texture?.bind?.(source);
		} catch {
			return false;
		}
	}

	source.resource = null;
	if (isCloseableBitmap(resource)) {
		try {
			resource.close();
		} catch {
			/* already closed */
		}
	}
	return true;
};

/**
 * Drop CPU twins for explicit Asset URLs only (sprites / atlas pages / TextureAtlas).
 * Used after tir cabinet GPU upload — short-lived textures that reload on next open.
 */
export const releaseCpuTwinsForUrls = (
	urls: readonly string[],
	app?: Application | null,
): number => {
	if (urls.length === 0) return 0;

	const into = new Map<number, TextureSource>();
	for (const url of urls) {
		try {
			if (!Cache.has(url)) continue;
			collectSourcesFromAsset(into, Assets.get(url));
		} catch {
			/* not in cache */
		}
	}

	let released = 0;
	for (const source of into.values()) {
		if (releaseTextureSourceCpuTwin(source, app)) released += 1;
	}
	return released;
};

/**
 * Release CPU twins for textures bound to `app` only.
 * No-op unless `{ force: true }` — see file header.
 */
export const releaseCpuTextureTwins = (
	app?: Application | null,
	options: ReleaseCpuTwinOptions = {},
): number => {
	if (!options.force || !app) return 0;

	let released = 0;
	for (const source of collectAppManagedSources(app)) {
		if (releaseTextureSourceCpuTwin(source, app)) released += 1;
	}
	return released;
};
