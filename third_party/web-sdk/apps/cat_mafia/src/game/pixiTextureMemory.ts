/**
 * Estimate Pixi texture footprint (atlases / sprites / render targets).
 * Not system RAM — width×height×bpp of TextureSources we hold.
 */

import { Cache, Texture, TextureSource, type Application } from 'pixi.js';

const RGBA_BYTES = 4;

export type PixiTextureMemoryEntry = {
	uid: number;
	label: string;
	bytes: number;
	pixelWidth: number;
	pixelHeight: number;
};

export type PixiTextureMemoryStats = {
	gpuBytes: number;
	gpuCount: number;
	cacheBytes: number;
	cacheCount: number;
	/** Unique sources across GPU + Assets.Cache */
	totalBytes: number;
	totalCount: number;
	top: PixiTextureMemoryEntry[];
};

type CacheMap = Map<unknown, unknown>;

const getCacheMap = (): CacheMap | null => {
	const map = (Cache as unknown as { _cache?: CacheMap })._cache;
	return map instanceof Map ? map : null;
};

const sourceLabel = (source: TextureSource): string => {
	const raw =
		source.label ||
		source._sourceOrigin ||
		(typeof source.resource === 'object' &&
		source.resource &&
		'src' in source.resource &&
		typeof (source.resource as { src?: unknown }).src === 'string'
			? (source.resource as { src: string }).src
			: '') ||
		`tex#${source.uid}`;
	const trimmed = raw.replace(/^.*\//, '').slice(0, 28);
	return trimmed || `tex#${source.uid}`;
};

export const estimateTextureSourceBytes = (source: TextureSource): number => {
	if (!source || source.destroyed) return 0;
	const w = source.pixelWidth | 0;
	const h = source.pixelHeight | 0;
	if (w <= 0 || h <= 0) return 0;

	const mipFactor =
		source.mipLevelCount > 1 || source.autoGenerateMipmaps ? 4 / 3 : 1;
	const samples = Math.max(1, source.sampleCount || 1);
	return Math.ceil(w * h * RGBA_BYTES * mipFactor * samples);
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

	// Spine TextureAtlas pages
	if (Array.isArray(anyVal.pages)) {
		for (const page of anyVal.pages) addSource(into, page);
		return;
	}

	// Atlas page / texture wrapper
	if (anyVal.texture) addSource(into, anyVal.texture);
	if (anyVal.source && anyVal.source instanceof TextureSource) {
		addSource(into, anyVal.source);
	}

	// Spritesheet / texture dictionaries
	if (anyVal.textures && typeof anyVal.textures === 'object') {
		for (const tex of Object.values(anyVal.textures as Record<string, unknown>)) {
			addSource(into, tex);
		}
	}

	if (Array.isArray(value)) {
		for (const item of value) addSource(into, item);
	}
};

const sumSources = (sources: Iterable<TextureSource>) => {
	let bytes = 0;
	let count = 0;
	for (const source of sources) {
		const b = estimateTextureSourceBytes(source);
		if (b <= 0) continue;
		bytes += b;
		count += 1;
	}
	return { bytes, count };
};

const collectTop = (sources: Map<number, TextureSource>, limit = 30): PixiTextureMemoryEntry[] => {
	const entries: PixiTextureMemoryEntry[] = [];
	for (const source of sources.values()) {
		const bytes = estimateTextureSourceBytes(source);
		if (bytes <= 0) continue;
		entries.push({
			uid: source.uid,
			label: sourceLabel(source),
			bytes,
			pixelWidth: source.pixelWidth | 0,
			pixelHeight: source.pixelHeight | 0,
		});
	}
	entries.sort((a, b) => b.bytes - a.bytes);
	return entries.slice(0, limit);
};

export const formatMb = (bytes: number): string => {
	const mb = bytes / (1024 * 1024);
	if (mb >= 100) return `${mb.toFixed(0)} MB`;
	if (mb >= 10) return `${mb.toFixed(1)} MB`;
	return `${mb.toFixed(2)} MB`;
};

export const estimatePixiTextureMemory = (
	app?: Application | null,
): PixiTextureMemoryStats => {
	const gpuSources = new Map<number, TextureSource>();
	const cacheSources = new Map<number, TextureSource>();

	const managed = (
		app?.renderer as unknown as { texture?: { managedTextures?: TextureSource[] } } | undefined
	)?.texture?.managedTextures;
	if (Array.isArray(managed)) {
		for (const source of managed) {
			if (source && !source.destroyed) gpuSources.set(source.uid, source);
		}
	}

	const cache = getCacheMap();
	if (cache) {
		for (const value of cache.values()) addSource(cacheSources, value);
	}

	const all = new Map<number, TextureSource>([...cacheSources, ...gpuSources]);
	const gpu = sumSources(gpuSources.values());
	const cached = sumSources(cacheSources.values());
	const total = sumSources(all.values());

	return {
		gpuBytes: gpu.bytes,
		gpuCount: gpu.count,
		cacheBytes: cached.bytes,
		cacheCount: cached.count,
		totalBytes: total.bytes,
		totalCount: total.count,
		top: collectTop(all),
	};
};
