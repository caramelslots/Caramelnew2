import * as PIXI from 'pixi.js';

export type BoardFeatherMaskParams = {
	width: number;
	height: number;
	topOverflow: number;
	bottomOverflow: number;
	/** Visible playfield height (px). */
	gridHeight: number;
	/** Soft fade length at top (and bottom unless `bottomFeather` is set) (px). */
	feather: number;
	/** Override bottom fade length; `0` = hard clip at mask bottom. */
	bottomFeather?: number;
};

const smoothstep = (t: number) => {
	const x = Math.min(1, Math.max(0, t));
	return x * x * (3 - 2 * x);
};

/**
 * Build an alpha-gradient mask texture (white RGB, soft alpha at mask edges).
 *
 * Always returns a fresh Texture. Sharing one Texture as `mask` across two
 * Pixi containers (dual Duel desks) clips the first desk to ~3/5 width.
 */
export const createBoardFeatherMaskTexture = (params: BoardFeatherMaskParams): PIXI.Texture => {
	const width = Math.max(1, Math.ceil(params.width));
	const height = Math.max(1, Math.ceil(params.height));
	const topOverflow = Math.max(0, params.topOverflow);
	const bottomOverflow = Math.max(0, params.bottomOverflow);
	const gridHeight = Math.max(1, params.gridHeight);
	const feather = Math.max(1, params.feather);
	const bottomFeatherLen = params.bottomFeather ?? feather;

	const gridTop = topOverflow;
	const gridBottom = gridTop + gridHeight;

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) return PIXI.Texture.WHITE;

	const imageData = ctx.createImageData(width, height);
	const data = imageData.data;

	for (let y = 0; y < height; y++) {
		// Visible grid stays at full opacity — feather lives only in overflow runways.
		let alpha = 1;

		if (topOverflow > 0 && y < gridTop) {
			const topFeather = Math.min(feather, topOverflow);
			const fadeEnd = topFeather;
			if (y < fadeEnd) {
				alpha = smoothstep(y / topFeather);
			}
		}

		if (bottomOverflow > 0 && y >= gridBottom) {
			if (bottomFeatherLen <= 0) {
				// Hard runway: full alpha through bottomOverflow, then mask ends.
				alpha = 1;
			} else {
				const bottomFeather = Math.min(bottomFeatherLen, bottomOverflow);
				const fadeStart = gridBottom + bottomOverflow - bottomFeather;
				if (y >= fadeStart) {
					alpha *= smoothstep((gridBottom + bottomOverflow - y) / bottomFeather);
				}
			}
		}

		const a = Math.round(alpha * 255);
		const row = y * width * 4;
		for (let x = 0; x < width; x++) {
			const i = row + x * 4;
			data[i] = 255;
			data[i + 1] = 255;
			data[i + 2] = 255;
			data[i + 3] = a;
		}
	}

	ctx.putImageData(imageData, 0, 0);
	return PIXI.Texture.from(canvas);
};

export const destroyBoardFeatherMaskTexture = (texture: PIXI.Texture | null | undefined) => {
	if (!texture || texture === PIXI.Texture.WHITE) return;
	texture.destroy(true);
};
