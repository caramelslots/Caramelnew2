import * as PIXI from 'pixi.js';

import type { LoadedAssets } from 'pixi-svelte';

/** HUD button textures that ship at 1000×1000 and render at ~60–160 design px. */
export const UI_BUTTON_TEXTURE_KEYS = [
	'betPlus',
	'betMinus',
	'spin1',
	'spin2',
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

const optimizeTexture = (texture: PIXI.Texture): PIXI.Texture => {
	const width = texture.width;
	const height = texture.height;
	if (Math.max(width, height) <= MAX_UI_TEXTURE_EDGE) return texture;

	const source = texture.source?.resource;
	if (!isCanvasImageSource(source)) return texture;

	const canvas = downscaleInSteps(source, width, height, MAX_UI_TEXTURE_EDGE);
	const optimized = PIXI.Texture.from(canvas);
	const optimizedSource = optimized.source as { autoGenerateMipmaps?: boolean };
	if ('autoGenerateMipmaps' in optimizedSource) {
		optimizedSource.autoGenerateMipmaps = true;
	}
	texture.destroy(false);
	return optimized;
};

export const optimizeUiButtonTextures = (loadedAssets: LoadedAssets) => {
	for (const key of UI_BUTTON_TEXTURE_KEYS) {
		const asset = loadedAssets[key];
		if (asset instanceof PIXI.Texture) {
			loadedAssets[key] = optimizeTexture(asset);
		}
	}
};
