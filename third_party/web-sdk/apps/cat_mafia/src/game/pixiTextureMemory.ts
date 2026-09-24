/**
 * Estimate Pixi texture footprint (atlases / sprites / render targets).
 * Not system RAM — width×height×bpp of TextureSources we hold.
 */

import { Cache, Texture, TextureSource, type Application } from 'pixi.js';
import type { SpinePlayer } from '@esotericsoftware/spine-player';

import { getLiveBuyBonusCardSpinePlayers } from './buyBonusCardGpu';
import { getLiveDuelPickSpinePlayers } from './duelPickGpu';

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
	/** HTML SpinePlayer canvases + atlas pages (buy-bonus / duel-pick). */
	htmlSpineBytes: number;
	htmlSpineCount: number;
	/** Unique sources across GPU + Assets.Cache + HTML Spine */
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

	const mipFactor = source.mipLevelCount > 1 || source.autoGenerateMipmaps ? 4 / 3 : 1;
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

type HtmlSpineAtlasPage = {
	name?: string;
	width?: number;
	height?: number;
	texture?: { getImage?: () => { width?: number; height?: number; src?: string } | null } | null;
};

type HtmlSpineAtlas = {
	pages?: HtmlSpineAtlasPage[];
};

type HtmlSpineAssetManager = {
	assets?: Record<string, unknown>;
};

const shortPathLabel = (path: string) =>
	path.replace(/^.*\//, '').slice(0, 28) || path.slice(0, 28);

/**
 * Estimate HTML SpinePlayer GPU: framebuffer (canvas) + atlas page textures.
 * Buy-bonus / duel-pick sit outside Pixi managedTextures — without this the RAM bar misses them.
 */
export const estimateHtmlSpinePlayerMemory = (
	players: readonly SpinePlayer[],
): { bytes: number; count: number; top: PixiTextureMemoryEntry[] } => {
	const top: PixiTextureMemoryEntry[] = [];
	let bytes = 0;
	let count = 0;
	let uid = -1;

	const push = (label: string, w: number, h: number) => {
		if (w <= 0 || h <= 0) return;
		const b = w * h * RGBA_BYTES;
		bytes += b;
		count += 1;
		top.push({
			uid: uid--,
			label,
			bytes: b,
			pixelWidth: w,
			pixelHeight: h,
		});
	};

	for (const player of players) {
		const canvas = player.canvas;
		if (canvas && canvas.width > 1 && canvas.height > 1) {
			push('html-spine:canvas', canvas.width | 0, canvas.height | 0);
		}

		const manager = player.assetManager as HtmlSpineAssetManager | null;
		const assets = manager?.assets;
		if (!assets || typeof assets !== 'object') continue;

		for (const [path, asset] of Object.entries(assets)) {
			if (!asset || typeof asset !== 'object') continue;
			const atlas = asset as HtmlSpineAtlas;
			if (!Array.isArray(atlas.pages)) continue;
			for (const page of atlas.pages) {
				const image = page.texture?.getImage?.() ?? null;
				const w = image?.width | 0 || page.width | 0;
				const h = image?.height | 0 || page.height | 0;
				const label = `html:${shortPathLabel(page.name || path)}`;
				push(label, w, h);
			}
		}
	}

	top.sort((a, b) => b.bytes - a.bytes);
	return { bytes, count, top: top.slice(0, 30) };
};

export const estimatePixiTextureMemory = (app?: Application | null): PixiTextureMemoryStats => {
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
	const pixiTotal = sumSources(all.values());

	const htmlSpine = estimateHtmlSpinePlayerMemory([
		...getLiveBuyBonusCardSpinePlayers(),
		...getLiveDuelPickSpinePlayers(),
	]);

	const mergedTop = [...collectTop(all), ...htmlSpine.top]
		.sort((a, b) => b.bytes - a.bytes)
		.slice(0, 30);

	return {
		gpuBytes: gpu.bytes,
		gpuCount: gpu.count,
		cacheBytes: cached.bytes,
		cacheCount: cached.count,
		htmlSpineBytes: htmlSpine.bytes,
		htmlSpineCount: htmlSpine.count,
		totalBytes: pixiTotal.bytes + htmlSpine.bytes,
		totalCount: pixiTotal.count + htmlSpine.count,
		top: mergedTop,
	};
};

/**
 * Soft-park only. Pixi `canvasText.reset()` / `unload()` frees atlas TextureSources
 * while HUD / SW `TightCanvasText` BindGroups still reference them →
 * `Cannot read properties of null (reading '_resourceId')` and a frozen stage.
 * Intentionally a no-op until a safe orphan sweep exists.
 */
export const releaseCanvasTextGpu = (_app?: Application | null) => {
	/* no-op */
};

/** Arabic HUD may keep one live CanvasText page. More than that is leftover tex#. */
export const MAX_LIVE_CANVAS_TEXT_ATLASES = 1;

/**
 * Was meant to drop leaked CanvasText atlas pages after mode / curtain changes.
 * Hard reset/destroy races live BindGroups — keep as a no-op for stability.
 */
export const releaseExcessCanvasTextGpu = (_app?: Application | null) => {
	/* no-op — do not reset/destroy CanvasText GPU while the stage is live */
};
