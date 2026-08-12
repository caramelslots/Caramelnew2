import { NEON_OVERLAY_TUNING } from './neonBackgroundTuning';

/**
 * BootstrapLoader shows logo/progress over the Pixi Background Spine (same asset as gameplay).
 */
export const LOADER_BG_PX = { width: 1920, height: 956 };

/** Skeleton setup AABB from `spines/background/skeleton.json`. */
export const SPINE_NATIVE = { width: 2079.9, height: 971.47 };
export const SPINE_BOUNDS = { x: -1008.48, y: -492.37, width: 2079.9, height: 971.47 };

/**
 * Opaque street plate in world units (root × attachment scale).
 * Used for cover-fit so the painted plate fills the canvas (no letterbox).
 */
const BG_ROOT_SCALE = 0.5082;
const BG_PLATE_ATTACH_SCALE = 1.9974;
const BG_PLATE_PX = { width: 1920, height: 940 };
export const BG_NATIVE = {
	width: BG_PLATE_PX.width * BG_PLATE_ATTACH_SCALE * BG_ROOT_SCALE,
	height: BG_PLATE_PX.height * BG_PLATE_ATTACH_SCALE * BG_ROOT_SCALE,
};

export const BG_RATIO = BG_NATIVE.width / BG_NATIVE.height;
export const BG_Y_OFFSET = 0;
export const BG_IDLE_ANIMATION = 'idle_final_delay2';

/**
 * < 1 zooms the street out horizontally so more of the scene fits.
 * 1 = tight cover on the opaque plate. ~0.88 shows ~12% more width.
 */
export const BG_VIEW_ZOOM = 0.95;

type CanvasSize = { width: number; height: number };

export const coverFit = (canvas: CanvasSize, ratio: number) => {
	const canvasRatio = canvas.width / canvas.height;
	if (canvasRatio > ratio) {
		return { width: canvas.width, height: canvas.width / ratio };
	}
	return { width: canvas.height * ratio, height: canvas.height };
};

/**
 * Non-uniform cover: X zoomed out for more street, Y stretched to fill canvas height.
 */
export const getBackgroundCoverScale = (canvas: CanvasSize) => {
	const cover = Math.max(canvas.width / BG_NATIVE.width, canvas.height / BG_NATIVE.height);
	return {
		x: cover * BG_VIEW_ZOOM,
		y: canvas.height / BG_NATIVE.height,
	};
};

/**
 * SpinePlayer viewport window that covers `canvas` with the street plate (CSS cover).
 * Pads are 0 so the player does not add the default 10% margin.
 */
export const getBackgroundCoverViewport = (canvas: CanvasSize) => {
	const { x: scaleX, y: scaleY } = getBackgroundCoverScale(canvas);
	const width = canvas.width / scaleX;
	const height = canvas.height / scaleY;
	return {
		x: -width / 2,
		y: -height / 2,
		width,
		height,
		padLeft: 0,
		padRight: 0,
		padTop: 0,
		padBottom: 0,
	};
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
		x: canvas.width / 2 + NEON_OVERLAY_TUNING.offsetX * spineScale,
		y: canvas.height * (0.5 - BG_Y_OFFSET) + NEON_OVERLAY_TUNING.offsetY * spineScale,
		scale: spineScale,
	};
};
