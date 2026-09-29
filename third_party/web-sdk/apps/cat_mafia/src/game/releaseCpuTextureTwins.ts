/**
 * Drop CPU-side ImageBitmap / HTMLImage twins after pixels are on the GPU.
 * Pixi keeps `TextureSource.resource` forever by default → ~2× system RAM for atlases.
 *
 * Do not release HTMLCanvasElement resources — CanvasText / feather masks still mutate them.
 * Call after phone atlas downscale / UI button optimize (those need the CPU source first).
 */

import { Cache, Texture, TextureSource, type Application } from 'pixi.js';

type CacheMap = Map<unknown, unknown>;

const getCacheMap = (): CacheMap | null => {
	const map = (Cache as unknown as { _cache?: CacheMap })._cache;
	return map instanceof Map ? map : null;
};

const addSource = (into: Map<number, TextureSource>, value: unknown) => {
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
		for (const page of anyVal.pages) addSource(into, page);
		return;
	}
	if (anyVal.texture) addSource(into, anyVal.texture);
	if (anyVal.source && anyVal.source instanceof TextureSource) {
		addSource(into, anyVal.source);
	}
	if (anyVal.textures && typeof anyVal.textures === 'object') {
		for (const tex of Object.values(anyVal.textures as Record<string, unknown>)) {
			addSource(into, tex);
		}
	}
	if (Array.isArray(value)) {
		for (const item of value) addSource(into, item);
	}
};

const collectTextureSources = (app?: Application | null): Map<number, TextureSource> => {
	const into = new Map<number, TextureSource>();

	const managed = (
		app?.renderer as unknown as { texture?: { managedTextures?: TextureSource[] } } | undefined
	)?.texture?.managedTextures;
	if (Array.isArray(managed)) {
		for (const source of managed) {
			if (source && !source.destroyed) into.set(source.uid, source);
		}
	}

	const cache = getCacheMap();
	if (cache) {
		for (const value of cache.values()) addSource(into, value);
	}

	return into;
};

const isCloseableBitmap = (resource: unknown): resource is ImageBitmap =>
	typeof ImageBitmap !== 'undefined' && resource instanceof ImageBitmap;

const isStaticCpuImage = (resource: unknown): boolean => {
	if (isCloseableBitmap(resource)) return true;
	if (typeof HTMLImageElement !== 'undefined' && resource instanceof HTMLImageElement) return true;
	return false;
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
			/* first draw will upload; still drop CPU — worst case blank until reload */
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

/** Sweep Cache + managed textures. Returns how many CPU twins were released. */
export const releaseCpuTextureTwins = (app?: Application | null): number => {
	let released = 0;
	for (const source of collectTextureSources(app).values()) {
		if (releaseTextureSourceCpuTwin(source, app)) released += 1;
	}
	return released;
};
