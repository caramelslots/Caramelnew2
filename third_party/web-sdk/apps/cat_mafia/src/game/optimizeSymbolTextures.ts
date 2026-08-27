import type { LoadedAssets, LoadedSprite } from 'pixi-svelte';

type SymbolTexture = LoadedSprite & {
	source?: { autoGenerateMipmaps?: boolean; style?: { scaleMode?: string } };
};

const isSymbolTexture = (asset: unknown): asset is SymbolTexture =>
	typeof asset === 'object' &&
	asset !== null &&
	'width' in asset &&
	'height' in asset &&
	'source' in asset;

/** Static symbol sprites from symbols/*.webp (196²). */
export const SYMBOL_TEXTURE_KEYS = [
	'H1Img',
	'H2Img',
	'H3Img',
	'H4Img',
	'L1Img',
	'L2Img',
	'L3Img',
	'L4Img',
	'BImg',
	'BTImg',
	'WImg',
] as const;

const optimizeTexture = (texture: SymbolTexture): SymbolTexture => {
	const source = texture.source;
	if (!source) return texture;

	source.autoGenerateMipmaps = true;
	if (source.style) {
		source.style.scaleMode = 'linear';
	}

	return texture;
};

export const optimizeSymbolTextures = (loadedAssets: LoadedAssets) => {
	for (const key of SYMBOL_TEXTURE_KEYS) {
		const asset = loadedAssets[key];
		if (isSymbolTexture(asset)) {
			loadedAssets[key] = optimizeTexture(asset);
		}
	}
};
