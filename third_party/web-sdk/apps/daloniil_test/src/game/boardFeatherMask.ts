import * as PIXI from 'pixi.js';

export type BoardFeatherMaskParams = {
	width: number;
	height: number;
	topOverflow: number;
	bottomOverflow: number;
	/** Visible playfield height (px). */
	gridHeight: number;
	/** Soft fade length at mask edges (px). */
	feather: number;
};

const smoothstep = (t: number) => {
	const x = Math.min(1, Math.max(0, t));
	return x * x * (3 - 2 * x);
};

let activeTexture: PIXI.Texture | null = null;
let activeCacheKey = '';

const cacheKeyFor = (params: {
	width: number;
	height: number;
	topOverflow: number;
	bottomOverflow: number;
	gridHeight: number;
	feather: number;
}) =>
	[
		params.width,
		params.height,
		params.topOverflow,
		params.bottomOverflow,
		params.gridHeight,
		params.feather,
	].join('|');

/** Build an alpha-gradient mask texture (white RGB, soft alpha at mask edges). */
export const createBoardFeatherMaskTexture = (params: BoardFeatherMaskParams): PIXI.Texture => {
	const width = Math.max(1, Math.ceil(params.width));
	const height = Math.max(1, Math.ceil(params.height));
	const topOverflow = Math.max(0, params.topOverflow);
	const bottomOverflow = Math.max(0, params.bottomOverflow);
	const gridHeight = Math.max(1, params.gridHeight);
	const feather = Math.max(1, params.feather);
	const cacheKey = cacheKeyFor({
		width,
		height,
		topOverflow,
		bottomOverflow,
		gridHeight,
		feather,
	});

	// Spin start/end flip overflow sizes — reuse GPU texture when dims match.
	if (activeTexture && activeCacheKey === cacheKey) {
		return activeTexture;
	}

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
			const bottomFeather = Math.min(feather, bottomOverflow);
			const fadeStart = gridBottom + bottomOverflow - bottomFeather;
			if (y >= fadeStart) {
				alpha *= smoothstep((gridBottom + bottomOverflow - y) / bottomFeather);
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

	if (activeTexture) activeTexture.destroy(true);
	activeTexture = PIXI.Texture.from(canvas);
	activeCacheKey = cacheKey;
	return activeTexture;
};

export const destroyBoardFeatherMaskTexture = () => {
	if (activeTexture) {
		activeTexture.destroy(true);
		activeTexture = null;
		activeCacheKey = '';
	}
};
