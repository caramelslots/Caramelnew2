import type { LoadedAssets, LoadedSprite } from 'pixi-svelte';

type TextureFromCanvas = (source: HTMLCanvasElement) => LoadedSprite;

type UiTexture = LoadedSprite & {
	source?: { resource?: unknown; autoGenerateMipmaps?: boolean };
	destroy: (destroyBase?: boolean) => void;
};

const isUiTexture = (asset: unknown): asset is UiTexture =>
	typeof asset === 'object' &&
	asset !== null &&
	'width' in asset &&
	'height' in asset &&
	'destroy' in asset &&
	typeof (asset as UiTexture).destroy === 'function';

const getTextureFrom = (texture: UiTexture): TextureFromCanvas => {
	const ctor = texture.constructor as { from: TextureFromCanvas };
	return ctor.from.bind(ctor);
};

/** HUD button textures that ship at 1000×1000 and render at ~60–160 design px. */
export const UI_BUTTON_TEXTURE_KEYS = [
	'betPlus',
	'betMinus',
	'spin1',
	'menuButton',
	'infoButton',
	'turbo1',
	'turbo2',
	'turbo3',
	'autoplayButton',
	'autoplayMobileButton',
] as const;

/**
 * Max edge length after CPU downscale. Covers spin (~158 design px) × DPR 2 with headroom.
 * Progressive halving avoids moiré on concentric ring art better than a single GPU sample.
 */
const MAX_UI_TEXTURE_EDGE = 320;

const isCanvasImageSource = (value: unknown): value is CanvasImageSource =>
	value instanceof HTMLImageElement ||
	value instanceof HTMLCanvasElement ||
	value instanceof ImageBitmap ||
	value instanceof HTMLVideoElement;

const downscaleInSteps = (
	source: CanvasImageSource,
	srcWidth: number,
	srcHeight: number,
	targetMaxEdge: number,
): HTMLCanvasElement => {
	let width = srcWidth;
	let height = srcHeight;
	let current: CanvasImageSource = source;

	while (Math.max(width, height) / 2 > targetMaxEdge) {
		width = Math.max(1, Math.round(width / 2));
		height = Math.max(1, Math.round(height / 2));
		const step = document.createElement('canvas');
		step.width = width;
		step.height = height;
		const ctx = step.getContext('2d');
		if (!ctx) break;
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(current, 0, 0, width, height);
		current = step;
	}

	const scale = targetMaxEdge / Math.max(width, height);
	const targetWidth = Math.max(1, Math.round(width * scale));
	const targetHeight = Math.max(1, Math.round(height * scale));
	const target = document.createElement('canvas');
	target.width = targetWidth;
	target.height = targetHeight;
	const targetCtx = target.getContext('2d');
	if (!targetCtx) return current instanceof HTMLCanvasElement ? current : target;

	targetCtx.imageSmoothingEnabled = true;
	targetCtx.imageSmoothingQuality = 'high';
	targetCtx.drawImage(current, 0, 0, targetWidth, targetHeight);
	return target;
};

const optimizeTexture = (texture: UiTexture, textureFrom: TextureFromCanvas): UiTexture => {
	const width = texture.width;
	const height = texture.height;
	if (Math.max(width, height) <= MAX_UI_TEXTURE_EDGE) return texture;

	const source = texture.source?.resource;
	if (!isCanvasImageSource(source)) return texture;

	const canvas = downscaleInSteps(source, width, height, MAX_UI_TEXTURE_EDGE);
	const optimized = textureFrom(canvas);
	const optimizedSource = optimized.source;
	if (optimizedSource && 'autoGenerateMipmaps' in optimizedSource) {
		optimizedSource.autoGenerateMipmaps = true;
	}
	texture.destroy(false);
	return optimized;
};

export const optimizeUiButtonTextures = (loadedAssets: LoadedAssets) => {
	let textureFrom: TextureFromCanvas | undefined;

	for (const key of UI_BUTTON_TEXTURE_KEYS) {
		const asset = loadedAssets[key];
		if (!isUiTexture(asset)) continue;

		if (!textureFrom) textureFrom = getTextureFrom(asset);
		loadedAssets[key] = optimizeTexture(asset, textureFrom);
	}
};
