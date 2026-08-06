import { NEON_OVERLAY_TUNING } from './neonBackgroundTuning';

/** Street day/night plates (`background/day.webp` / `night.webp`) — 1920×941. */
export const BG_NATIVE = { width: 1920, height: 941 };
export const SPINE_NATIVE = { width: 1934.26, height: 1171.28 };
export const BG_RATIO = BG_NATIVE.width / BG_NATIVE.height;
export const BG_Y_OFFSET = 0;

type CanvasSize = { width: number; height: number };

export const coverFit = (canvas: CanvasSize, ratio: number) => {
	const canvasRatio = canvas.width / canvas.height;
	if (canvasRatio > ratio) {
		return { width: canvas.width, height: canvas.width / ratio };
	}
	return { width: canvas.height * ratio, height: canvas.height };
};

/**
 * Вычисляет позицию и масштаб Spine-оверлея для neon-фона.
 *
 * Используется anchor=0 (нет pivot): Spine-точка (0,0) = (x, y) в canvas.
 * Формула рендера: canvas_x = x + bone.x * scale
 *                  canvas_y = y - bone.y * scale   ← Spine Y-ось инвертирована
 *
 * Это гарантирует линейное (пропорциональное) масштабирование при ресайзе.
 */
export const getNeonOverlayProps = (canvas: CanvasSize) => {
	const bgCover = coverFit(canvas, BG_RATIO);
	const spineScale = (bgCover.width / BG_NATIVE.width) * NEON_OVERLAY_TUNING.scale;

	return {
		// Spine (0,0) помещается в canvas-center + сдвиг в Spine design-единицах
		x: canvas.width / 2 + NEON_OVERLAY_TUNING.offsetX * spineScale,
		y: canvas.height * (0.5 - BG_Y_OFFSET) + NEON_OVERLAY_TUNING.offsetY * spineScale,
		scale: spineScale,
	};
};
