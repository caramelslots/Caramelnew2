/** Paw-coin layout constants + live Spine canvas blit (HTML overlay). */

export type CoinPawSkin = 'bronze' | 'silver' | 'gold';

export const COIN_PAW_SOURCE_SIZE = 256;
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

export const coinPawSkinForTier = (tier: number): CoinPawSkin => {
	if (tier >= 3) return 'gold';
	if (tier === 2) return 'silver';
	return 'bronze';
};

/** Blit a live Spine viewport (256² framing) into a cell canvas. */
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
