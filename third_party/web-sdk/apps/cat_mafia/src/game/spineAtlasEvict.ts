/**
 * Evict Spine atlas + skeleton + page bitmaps from Pixi Assets.Cache / GPU.
 * Unloading only `.atlas` / `.json` leaves `*.webp` TextureSources resident
 * (they show up in the Dev RAM dump as shot_bullet.webp / total_win.webp / …).
 */

import { Assets, Cache, Texture } from 'pixi.js';
import type { TextureAtlas } from '@esotericsoftware/spine-core';
import { SpineTexture } from '@esotericsoftware/spine-pixi-v8';

const atlasPageFileNames = (atlasText: string): string[] => {
	const files: string[] = [];
	for (const raw of atlasText.split(/\r?\n/)) {
		const line = raw.trim();
		if (/^(?:.*\/)?[^:\s]+\.(webp|png|jpe?g)$/i.test(line)) files.push(line);
	}
	return files;
};

export const resolveAtlasPageUrl = (atlasUrl: string, file: string) => {
	if (/^[a-z]+:/i.test(file) || file.startsWith('/')) return file;
	const slash = atlasUrl.lastIndexOf('/');
	return `${slash >= 0 ? atlasUrl.slice(0, slash + 1) : ''}${file}`;
};

const cacheHas = (url: string) => {
	try {
		return Cache.has(url) || (Assets.cache as { has?: (k: string) => boolean } | undefined)?.has?.(url) === true;
	} catch {
		return false;
	}
};

/** True if atlas / skeleton / sibling page might still be in Cache. */
export const spineAssetsPossiblyCached = (atlasUrl: string, skeletonUrl?: string) => {
	if (atlasUrl && cacheHas(atlasUrl)) return true;
	if (skeletonUrl && cacheHas(skeletonUrl)) return true;
	if (atlasUrl && /\.atlas$/i.test(atlasUrl) && cacheHas(atlasUrl.replace(/\.atlas$/i, '.webp'))) {
		return true;
	}
	try {
		const atlas = Assets.get(atlasUrl) as TextureAtlas | undefined;
		if (atlas?.pages?.length) return true;
	} catch {
		/* not loaded */
	}
	return false;
};

const destroyCachedAssetGpu = (url: string) => {
	try {
		if (!cacheHas(url)) return;
		const asset = Assets.get(url) as
			| TextureAtlas
			| Texture
			| { destroy?: (n?: boolean) => void }
			| undefined;
		if (!asset || typeof asset !== 'object') return;
		if ('pages' in asset && Array.isArray((asset as TextureAtlas).pages)) {
			for (const page of (asset as TextureAtlas).pages) {
				try {
					(page.texture as SpineTexture | null)?.texture?.destroy(true);
				} catch {
					/* already gone */
				}
			}
			return;
		}
		if (asset instanceof Texture) {
			try {
				asset.destroy(true);
			} catch {
				/* already gone */
			}
			return;
		}
		if (typeof (asset as { destroy?: (n?: boolean) => void }).destroy === 'function') {
			try {
				(asset as { destroy: (n?: boolean) => void }).destroy(true);
			} catch {
				/* already gone */
			}
		}
	} catch {
		/* not in cache */
	}
};

/** Collect atlas + skeleton + page image URLs for a full Cache/GPU drop. */
export const collectSpineEvictUrls = async (
	atlasUrl: string,
	skeletonUrl?: string,
): Promise<string[]> => {
	const urls = new Set<string>();
	if (atlasUrl) urls.add(atlasUrl);
	if (skeletonUrl) urls.add(skeletonUrl);

	// Live atlas pages (name is usually `shot_bullet.webp`).
	try {
		const atlas = Assets.get(atlasUrl) as TextureAtlas | undefined;
		if (atlas?.pages?.length) {
			for (const page of atlas.pages) {
				if (page.name) urls.add(resolveAtlasPageUrl(atlasUrl, page.name));
			}
		}
	} catch {
		/* not loaded */
	}

	// Single-page atlases in this game are sibling `.webp` of the `.atlas`.
	if (/\.atlas$/i.test(atlasUrl)) {
		urls.add(atlasUrl.replace(/\.atlas$/i, '.webp'));
	}

	// Authoritative page list from atlas text (multi-page safe).
	try {
		const text = await fetch(atlasUrl).then((res) => (res.ok ? res.text() : ''));
		if (text) {
			for (const file of atlasPageFileNames(text)) {
				urls.add(resolveAtlasPageUrl(atlasUrl, file));
			}
		}
	} catch {
		/* offline / already gone */
	}

	return [...urls];
};

/**
 * Destroy page GPU → Assets.unload → Cache.remove.
 * Call only after spines have left the stage (frame barrier), or BindGroups race.
 */
export const evictSpineAssetUrls = async (urls: readonly string[]) => {
	if (urls.length === 0) return;
	for (const url of urls) destroyCachedAssetGpu(url);
	try {
		await Assets.unload([...urls]);
	} catch {
		/* already empty */
	}
	for (const url of urls) {
		try {
			if (Cache.has(url)) Cache.remove(url);
		} catch {
			/* already gone */
		}
	}
};

export const evictSpineAtlasAndPages = async (atlasUrl: string, skeletonUrl?: string) => {
	const urls = await collectSpineEvictUrls(atlasUrl, skeletonUrl);
	await evictSpineAssetUrls(urls);
};
