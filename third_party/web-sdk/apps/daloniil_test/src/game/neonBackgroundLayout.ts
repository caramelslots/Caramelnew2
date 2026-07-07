import { NEON_OVERLAY_TUNING } from './neonBackgroundTuning';

export const BG_NATIVE = { width: 1922, height: 1074 };
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

export const getNeonOverlayProps = (canvas: CanvasSize) => {
	const bgCover = coverFit(canvas, BG_RATIO);
	const scale = (bgCover.width / BG_NATIVE.width) * NEON_OVERLAY_TUNING.scale;
	const offsetX = NEON_OVERLAY_TUNING.centerX + NEON_OVERLAY_TUNING.offsetX;
	const offsetY = NEON_OVERLAY_TUNING.centerY + NEON_OVERLAY_TUNING.offsetY;

	return {
		x: canvas.width / 2 + offsetX * scale,
		y: canvas.height * (0.5 - BG_Y_OFFSET) + offsetY * scale,
		width: SPINE_NATIVE.width * scale,
		height: SPINE_NATIVE.height * scale,
	};
};
