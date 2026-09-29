/**
 * Estimate Pixi texture footprint (atlases / sprites / render targets).
 * Not system RAM — width×height×bpp of TextureSources we hold.
 */

import { Cache, Texture, TextureSource, type Application } from 'pixi.js';
import type { SpinePlayer } from '@esotericsoftware/spine-player';

import { getBuyBonusSharedPixiApp } from './buyBonusSharedPixi';
import { getLiveBuyBonusCardSpinePlayers } from './buyBonusCardGpu';
import { getLiveDuelPickSpinePlayers } from './duelPickGpu';

const RGBA_BYTES = 4;
/** Typical WebGL MSAA sample count when context was created with antialias:true. */
const MSAA_SAMPLES = 4;

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
	/** HTML SpinePlayer atlas pages (buy-bonus / duel-pick). Canvas FBs are in framebuffer*. */
	htmlSpineBytes: number;
	htmlSpineCount: number;
	/** Live WebGL backbuffers (main / buyBonus / other canvases), MSAA-aware. */
	framebufferBytes: number;
	framebufferCount: number;
	/**
	 * CPU-side decoded copies still held: Pixi TextureSource.resource (ImageBitmap /
	 * HTMLImage / canvas2d), buy-bonus warmup bitmaps, DOM &lt;img&gt;.
	 * These sit in system RAM on top of GPU uploads.
	 */
	cpuBytes: number;
	cpuCount: number;
	/** Unique sources across GPU + Cache + HTML Spine + FB + CPU twins */
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
 * Estimate HTML SpinePlayer atlas page textures (not canvas FBs — those go through
 * estimateWebglFramebufferMemory so MSAA / main / buyBonus share one FB line).
 */
export const estimateHtmlSpinePlayerMemory = (
	players: readonly SpinePlayer[],
	limit = 30,
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
	return {
		bytes,
		count,
		top: Number.isFinite(limit) ? top.slice(0, limit) : top,
	};
};

const webglSampleCount = (canvas: HTMLCanvasElement): number => {
	try {
		const gl =
			(canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
			(canvas.getContext('webgl') as WebGLRenderingContext | null);
		if (!gl) return 0;
		return gl.getContextAttributes()?.antialias ? MSAA_SAMPLES : 1;
	} catch {
		return 0;
	}
};

/** Color + depth (×samples) + resolve color when MSAA is on. */
export const estimateFramebufferBytes = (pixelWidth: number, pixelHeight: number, samples: number) => {
	const w = pixelWidth | 0;
	const h = pixelHeight | 0;
	const s = Math.max(1, samples | 0);
	if (w <= 0 || h <= 0) return 0;
	const color = w * h * RGBA_BYTES * s;
	const depth = w * h * RGBA_BYTES * s;
	const resolve = s > 1 ? w * h * RGBA_BYTES : 0;
	return color + depth + resolve;
};

const canvasHostLabel = (canvas: HTMLCanvasElement): string => {
	const host =
		canvas.closest(
			'.spin-button-spine, .mascot-spine, .spine-host, .shot-host, .flip-shift, .coin-paw-spine-hub, .player',
		) ?? canvas.parentElement;
	const cls =
		host instanceof HTMLElement
			? [...host.classList].find((c) => c && c !== 'spine-player') || host.classList[0]
			: '';
	return cls ? `fb:${cls.slice(0, 22)}` : 'fb:webgl';
};

/**
 * Live WebGL backbuffers — main Pixi, buy-bonus host, spin/mascot/etc.
 * These dominate Jetsam far more than atlas TextureSources at maxResolution.
 */
export const estimateWebglFramebufferMemory = (
	app?: Application | null,
	limit = 30,
): { bytes: number; count: number; top: PixiTextureMemoryEntry[] } => {
	const top: PixiTextureMemoryEntry[] = [];
	const seen = new WeakSet<HTMLCanvasElement>();
	let bytes = 0;
	let count = 0;
	let uid = -9000;

	const push = (label: string, canvas: HTMLCanvasElement | null | undefined) => {
		if (!canvas || seen.has(canvas)) return;
		const w = canvas.width | 0;
		const h = canvas.height | 0;
		if (w <= 1 || h <= 1) return;
		const samples = webglSampleCount(canvas);
		if (samples <= 0) return;
		seen.add(canvas);
		const b = estimateFramebufferBytes(w, h, samples);
		if (b <= 0) return;
		bytes += b;
		count += 1;
		top.push({
			uid: uid--,
			label: samples > 1 ? `${label}×${samples}AA` : label,
			bytes: b,
			pixelWidth: w,
			pixelHeight: h,
		});
	};

	push('fb:main', (app?.canvas as HTMLCanvasElement | undefined) ?? null);
	push(
		'fb:buyBonus',
		(getBuyBonusSharedPixiApp()?.canvas as HTMLCanvasElement | undefined) ?? null,
	);

	if (typeof document !== 'undefined') {
		for (const el of document.querySelectorAll('canvas')) {
			push(canvasHostLabel(el as HTMLCanvasElement), el as HTMLCanvasElement);
		}
	}

	top.sort((a, b) => b.bytes - a.bytes);
	return {
		bytes,
		count,
		top: Number.isFinite(limit) ? top.slice(0, limit) : top,
	};
};

type CpuResourceKind = 'bitmap' | 'img' | 'canvas2d';

const cpuResourceInfo = (
	resource: unknown,
): { w: number; h: number; kind: CpuResourceKind } | null => {
	try {
		if (typeof ImageBitmap !== 'undefined' && resource instanceof ImageBitmap) {
			const w = resource.width | 0;
			const h = resource.height | 0;
			if (w <= 0 || h <= 0) return null;
			return { w, h, kind: 'bitmap' };
		}
		if (typeof HTMLImageElement !== 'undefined' && resource instanceof HTMLImageElement) {
			const w = (resource.naturalWidth || resource.width) | 0;
			const h = (resource.naturalHeight || resource.height) | 0;
			if (w <= 0 || h <= 0) return null;
			return { w, h, kind: 'img' };
		}
		if (typeof HTMLCanvasElement !== 'undefined' && resource instanceof HTMLCanvasElement) {
			// WebGL canvases are framebuffers, not CPU decode twins.
			if (webglSampleCount(resource) > 0) return null;
			const w = resource.width | 0;
			const h = resource.height | 0;
			if (w <= 1 || h <= 1) return null;
			return { w, h, kind: 'canvas2d' };
		}
	} catch {
		/* closed ImageBitmap / detached */
	}
	return null;
};

/**
 * CPU RAM still holding decoded pixels after (or before) GPU upload:
 * Pixi TextureSource.resource twins, buy-bonus warmup ImageBitmaps, live DOM &lt;img&gt;.
 */
export const estimateCpuTwinMemory = (
	sources: Iterable<TextureSource>,
	limit = 30,
): { bytes: number; count: number; top: PixiTextureMemoryEntry[] } => {
	const top: PixiTextureMemoryEntry[] = [];
	const seen = new WeakSet<object>();
	let bytes = 0;
	let count = 0;
	let uid = -7000;

	const push = (label: string, resource: unknown) => {
		if (!resource || (typeof resource === 'object' && seen.has(resource as object))) return;
		const info = cpuResourceInfo(resource);
		if (!info) return;
		if (typeof resource === 'object') seen.add(resource as object);
		const b = info.w * info.h * RGBA_BYTES;
		bytes += b;
		count += 1;
		top.push({
			uid: uid--,
			label: `cpu:${info.kind}:${label}`,
			bytes: b,
			pixelWidth: info.w,
			pixelHeight: info.h,
		});
	};

	for (const source of sources) {
		if (!source || source.destroyed) continue;
		push(sourceLabel(source), source.resource);
	}

	if (typeof document !== 'undefined') {
		for (const el of document.querySelectorAll('img')) {
			const img = el as HTMLImageElement;
			if (!img.complete) continue;
			const src = img.currentSrc || img.src || 'dom-img';
			push(`dom:${shortPathLabel(src)}`, img);
		}
	}

	top.sort((a, b) => b.bytes - a.bytes);
	return {
		bytes,
		count,
		top: Number.isFinite(limit) ? top.slice(0, limit) : top,
	};
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
	const framebuffers = estimateWebglFramebufferMemory(app);
	const cpu = estimateCpuTwinMemory(all.values());

	const mergedTop = [...collectTop(all), ...htmlSpine.top, ...framebuffers.top, ...cpu.top]
		.sort((a, b) => b.bytes - a.bytes)
		.slice(0, 30);

	return {
		gpuBytes: gpu.bytes,
		gpuCount: gpu.count,
		cacheBytes: cached.bytes,
		cacheCount: cached.count,
		htmlSpineBytes: htmlSpine.bytes,
		htmlSpineCount: htmlSpine.count,
		framebufferBytes: framebuffers.bytes,
		framebufferCount: framebuffers.count,
		cpuBytes: cpu.bytes,
		cpuCount: cpu.count,
		totalBytes: pixiTotal.bytes + htmlSpine.bytes + framebuffers.bytes + cpu.bytes,
		totalCount: pixiTotal.count + htmlSpine.count + framebuffers.count + cpu.count,
		top: mergedTop,
	};
};

export type PixiTextureMemoryDump = PixiTextureMemoryStats & {
	at: string;
	all: PixiTextureMemoryEntry[];
	cacheKeys: string[];
};

/** Full snapshot for console compare (not truncated to top 30). */
export const collectPixiTextureMemoryDump = (
	app?: Application | null,
): PixiTextureMemoryDump => {
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
	const cacheKeys: string[] = [];
	if (cache) {
		for (const [key, value] of cache.entries()) {
			cacheKeys.push(typeof key === 'string' ? key : String(key));
			addSource(cacheSources, value);
		}
	}
	cacheKeys.sort();

	const all = new Map<number, TextureSource>([...cacheSources, ...gpuSources]);
	const gpu = sumSources(gpuSources.values());
	const cached = sumSources(cacheSources.values());
	const pixiTotal = sumSources(all.values());

	const htmlSpine = estimateHtmlSpinePlayerMemory(
		[...getLiveBuyBonusCardSpinePlayers(), ...getLiveDuelPickSpinePlayers()],
		Number.POSITIVE_INFINITY,
	);
	const framebuffers = estimateWebglFramebufferMemory(app, Number.POSITIVE_INFINITY);
	const cpu = estimateCpuTwinMemory(all.values(), Number.POSITIVE_INFINITY);

	const mergedAll = [
		...collectTop(all, Number.POSITIVE_INFINITY),
		...htmlSpine.top,
		...framebuffers.top,
		...cpu.top,
	].sort((a, b) => b.bytes - a.bytes);

	return {
		at: new Date().toISOString(),
		gpuBytes: gpu.bytes,
		gpuCount: gpu.count,
		cacheBytes: cached.bytes,
		cacheCount: cached.count,
		htmlSpineBytes: htmlSpine.bytes,
		htmlSpineCount: htmlSpine.count,
		framebufferBytes: framebuffers.bytes,
		framebufferCount: framebuffers.count,
		cpuBytes: cpu.bytes,
		cpuCount: cpu.count,
		totalBytes: pixiTotal.bytes + htmlSpine.bytes + framebuffers.bytes + cpu.bytes,
		totalCount: pixiTotal.count + htmlSpine.count + framebuffers.count + cpu.count,
		top: mergedAll.slice(0, 30),
		all: mergedAll,
		cacheKeys,
	};
};

/** Log full GPU/Cache/HTML-Spine snapshot — for before/after compare in DevTools. */
export const dumpPixiTextureMemoryToConsole = (app?: Application | null) => {
	const dump = collectPixiTextureMemoryDump(app);
	const lines = dump.all.map(
		(e, i) =>
			`${String(i + 1).padStart(3, ' ')}. ${formatMb(e.bytes).padStart(8)}  ${e.pixelWidth}×${e.pixelHeight}  ${e.label}`,
	);
	console.groupCollapsed(
		`[RAM dump] ${dump.at} · total ~${formatMb(dump.totalBytes)} (${dump.totalCount} surfaces)`,
	);
	console.log(
		`Pixi GPU ${formatMb(dump.gpuBytes)} (${dump.gpuCount}) · Cache ${formatMb(dump.cacheBytes)} (${dump.cacheCount}) · HTML Spine ${formatMb(dump.htmlSpineBytes)} (${dump.htmlSpineCount}) · FB ${formatMb(dump.framebufferBytes)} (${dump.framebufferCount}) · CPU ${formatMb(dump.cpuBytes)} (${dump.cpuCount})`,
	);
	console.log(lines.join('\n'));
	console.log(`Cache keys (${dump.cacheKeys.length}):`, dump.cacheKeys);
	console.log('raw', dump);
	console.groupEnd();
	return dump;
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
