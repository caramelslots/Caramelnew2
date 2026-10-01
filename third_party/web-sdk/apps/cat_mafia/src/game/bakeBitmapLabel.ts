/**
 * Bake Pixi bitmap-font text onto a 2D canvas.
 * Same glyphs as BitmapText, no game-renderer extract / GPU readback.
 */
import { BitmapFontManager, Cache, TextStyle, type Texture } from 'pixi.js';

const asImageSource = (texture: Texture): CanvasImageSource | null => {
	const resource = texture.source?.resource;
	if (!resource || typeof resource !== 'object') return null;
	if (resource instanceof HTMLImageElement) return resource;
	if (resource instanceof HTMLCanvasElement) return resource;
	if (typeof ImageBitmap !== 'undefined' && resource instanceof ImageBitmap) return resource;
	if (typeof OffscreenCanvas !== 'undefined' && resource instanceof OffscreenCanvas) {
		return resource as unknown as CanvasImageSource;
	}
	return null;
};

export const bakeBitmapLabel = (
	canvas: HTMLCanvasElement,
	opts: {
		text: string;
		fontFamily: string;
		fontSize: number;
		letterSpacing: number;
		maxWidth: number;
		displayScale: number;
		minScale?: number;
	},
): boolean => {
	const cacheKey = `${opts.fontFamily}-bitmap`;
	if (!Cache.has(cacheKey)) return false;

	const style = new TextStyle({
		fontFamily: opts.fontFamily,
		fontSize: opts.fontSize,
		align: 'center',
		letterSpacing: opts.letterSpacing,
		fontWeight: 'bold',
	});
	const font = BitmapFontManager.getFont(opts.text, style);
	const layout = BitmapFontManager.getLayout(opts.text, style);
	const rawW = layout.width * layout.scale;
	const rawH = (layout.height + layout.offsetY) * layout.scale;
	if (rawW < 1 || rawH < 1) return false;

	const minScale = opts.minScale ?? 0;
	const fit = Math.min(Math.max(opts.maxWidth / rawW, minScale), 1);
	const w = Math.max(1, Math.ceil(rawW * fit));
	const h = Math.max(1, Math.ceil(rawH * fit));
	const s = layout.scale * fit;

	if (canvas.width !== w) canvas.width = w;
	if (canvas.height !== h) canvas.height = h;

	const ctx = canvas.getContext('2d');
	if (!ctx) return false;
	ctx.clearRect(0, 0, w, h);
	ctx.imageSmoothingEnabled = true;

	const chars = Array.from(opts.text);
	let index = 0;
	let currentY = font.baseLineOffset;

	for (const line of layout.lines) {
		for (let j = 0; j < line.charPositions.length; j++) {
			const char = chars[index++];
			if (char == null) continue;
			const charData = font.chars[char];
			const texture = charData?.texture;
			if (!texture) continue;
			const source = asImageSource(texture);
			const frame = texture.frame;
			if (!source || frame.width < 1 || frame.height < 1) continue;
			ctx.drawImage(
				source,
				frame.x,
				frame.y,
				frame.width,
				frame.height,
				Math.round(line.charPositions[j] + charData.xOffset) * s,
				Math.round(currentY + charData.yOffset) * s,
				frame.width * s,
				frame.height * s,
			);
		}
		currentY += font.lineHeight;
	}

	canvas.style.width = `${w * opts.displayScale}px`;
	canvas.style.height = `${h * opts.displayScale}px`;
	return true;
};
