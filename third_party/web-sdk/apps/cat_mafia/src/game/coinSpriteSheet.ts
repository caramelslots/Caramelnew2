/** Baked designer Spine clips (`designer_assets/coins`) for HTML paw coins. */

export type CoinPawSkin = 'bronze' | 'silver' | 'gold';

export type CoinPawFrame = {
	frame: { x: number; y: number; w: number; h: number };
	spriteSourceSize: { x: number; y: number; w: number; h: number };
	sourceSize: { w: number; h: number };
};

export type CoinPawSheet = {
	image: HTMLImageElement;
	frames: Record<string, CoinPawFrame>;
	animations: Record<string, string[]>;
};

export const COIN_PAW_SOURCE_SIZE = 256;
export const COIN_PAW_APPEAR_FPS = 20;
export const COIN_PAW_LOOP_FPS = 18;
/**
 * Rest-pose coin disc inside the 256 bake canvas (last `appear` / first `loop`
 * frame). Mapped into the inner draw rect so the disc is smaller than the cell
 * and appear squash has room (canvas clips; CSS overflow cannot save it).
 */
export const COIN_PAW_CONTENT = { x: 76, y: 66, w: 116, h: 122 } as const;
/** Same on-cell fill as paying symbols (`CELL_SYMBOL_SIZE` in constants). */
export const COIN_PAW_SYMBOL_FILL = 0.85;
/** Overlay box vs cell — appear squash + appear_flash glow need room (HTML). */
export const COIN_PAW_BOX_SCALE = 1.9;
/** Rest disc as a fraction of the overlay box (= 0.85 of the symbol cell). */
export const COIN_PAW_DRAW_FILL = COIN_PAW_SYMBOL_FILL / COIN_PAW_BOX_SCALE;

/**
 * Pixi `SpineProvider` size vs cell. Skeleton AABB is 472×485; the disc is
 * ≈272×295 inside it. Inflate so the disc lands at COIN_PAW_SYMBOL_FILL
 * (same as board SymbolCoinPaw / former HTML overlay visual).
 */
export const COIN_PAW_SPINE_SIZE_RATIOS = {
	width: COIN_PAW_SYMBOL_FILL * (472 / 272),
	height: COIN_PAW_SYMBOL_FILL * (485 / 295),
} as const;

const assetUrl = (file: string) =>
	new URL(`assets/sprites/coin/${file}`.replace(/^\//, ''), window.location.href).href;

export const COIN_PAW_SHEET_URL = assetUrl('coins_paw.webp');
export const COIN_PAW_JSON_URL = assetUrl('coins_paw.json');

export const coinPawSkinForTier = (tier: number): CoinPawSkin => {
	if (tier >= 3) return 'gold';
	if (tier === 2) return 'silver';
	return 'bronze';
};

const isEmptyFrame = (frame: CoinPawFrame) =>
	frame.frame.w >= COIN_PAW_SOURCE_SIZE - 2 &&
	frame.frame.h >= COIN_PAW_SOURCE_SIZE - 2 &&
	frame.spriteSourceSize.x === 0 &&
	frame.spriteSourceSize.y === 0;

let loadPromise: Promise<CoinPawSheet> | null = null;

export const loadCoinPawSheet = (): Promise<CoinPawSheet> => {
	if (!loadPromise) {
		loadPromise = (async () => {
			const [json, image] = await Promise.all([
				fetch(COIN_PAW_JSON_URL).then((res) => {
					if (!res.ok) throw new Error(`Failed to load ${COIN_PAW_JSON_URL}`);
					return res.json() as Promise<{
						frames: Record<string, CoinPawFrame>;
						animations: Record<string, string[]>;
					}>;
				}),
				new Promise<HTMLImageElement>((resolve, reject) => {
					const img = new Image();
					img.onload = () => resolve(img);
					img.onerror = () => reject(new Error(`Failed to load ${COIN_PAW_SHEET_URL}`));
					img.src = COIN_PAW_SHEET_URL;
				}),
			]);

			const animations = Object.fromEntries(
				Object.entries(json.animations).map(([name, frames]) => [
					name,
					frames.filter((frameName) => {
						const frame = json.frames[frameName];
						return frame && !isEmptyFrame(frame);
					}),
				]),
			);

			return { image, frames: json.frames, animations };
		})();
	}
	return loadPromise;
};

export const startCoinPawSheetPreload = () => {
	if (typeof window === 'undefined') return;
	void loadCoinPawSheet();
};

const beginCoinPawDraw = (
	ctx: CanvasRenderingContext2D,
	destW: number,
	destH: number,
	alpha: number,
) => {
	const innerW = destW * COIN_PAW_DRAW_FILL;
	const innerH = destH * COIN_PAW_DRAW_FILL;
	const padX = (destW - innerW) / 2;
	const padY = (destH - innerH) / 2;
	const scaleX = innerW / COIN_PAW_CONTENT.w;
	const scaleY = innerH / COIN_PAW_CONTENT.h;
	if (alpha >= 1) ctx.clearRect(0, 0, destW, destH);
	ctx.save();
	ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
	// Bake / live capture uses SpinePlayer scaleY = -1 (canvas Y-down).
	ctx.translate(0, destH);
	ctx.scale(1, -1);
	return { padX, padY, scaleX, scaleY };
};

export const drawCoinPawFrame = (
	ctx: CanvasRenderingContext2D,
	sheet: CoinPawSheet,
	frameName: string,
	destW: number,
	destH: number,
	alpha = 1,
) => {
	const frame = sheet.frames[frameName];
	if (!frame) return;
	const { padX, padY, scaleX, scaleY } = beginCoinPawDraw(ctx, destW, destH, alpha);
	ctx.drawImage(
		sheet.image,
		frame.frame.x,
		frame.frame.y,
		frame.frame.w,
		frame.frame.h,
		padX + (frame.spriteSourceSize.x - COIN_PAW_CONTENT.x) * scaleX,
		padY + (frame.spriteSourceSize.y - COIN_PAW_CONTENT.y) * scaleY,
		frame.frame.w * scaleX,
		frame.frame.h * scaleY,
	);
	ctx.restore();
};

/** Blit a live Spine viewport (same framing as the 256 bake canvas) into a cell. */
export const drawCoinPawLive = (
	ctx: CanvasRenderingContext2D,
	source: CanvasImageSource,
	sourceW: number,
	sourceH: number,
	destW: number,
	destH: number,
	fit: 'disc' | 'full' = 'disc',
) => {
	if (sourceW < 1 || sourceH < 1) return;
	ctx.clearRect(0, 0, destW, destH);
	if (fit === 'full') {
		ctx.drawImage(source, 0, 0, sourceW, sourceH, 0, 0, destW, destH);
		return;
	}
	const innerW = destW * COIN_PAW_DRAW_FILL;
	const innerH = destH * COIN_PAW_DRAW_FILL;
	const padX = (destW - innerW) / 2;
	const padY = (destH - innerH) / 2;
	const scaleX = innerW / COIN_PAW_CONTENT.w;
	const scaleY = innerH / COIN_PAW_CONTENT.h;
	// Live WebGL already matches the on-screen Spine pose — do not flip again
	// (the bake-sheet path still flips because those frames were stored upside-down).
	ctx.drawImage(
		source,
		0,
		0,
		sourceW,
		sourceH,
		padX - COIN_PAW_CONTENT.x * scaleX,
		padY - COIN_PAW_CONTENT.y * scaleY,
		COIN_PAW_SOURCE_SIZE * scaleX,
		COIN_PAW_SOURCE_SIZE * scaleY,
	);
};
