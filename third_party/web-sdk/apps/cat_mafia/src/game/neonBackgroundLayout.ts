/**
 * Street background cover-fit (Pixi `mainBackground` + BootstrapLoader).
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

export const BG_Y_OFFSET = 0;
export const BG_IDLE_ANIMATION = 'idle_final_delay2';

/**
 * < 1 zooms the street out horizontally so more of the scene fits.
 * 1 = tight cover on the opaque plate. ~0.88 shows ~12% more width.
 */
export const BG_VIEW_ZOOM = 0.95;

/**
 * day.webp loader still is framed slightly tighter than the Spine plate.
 * Pixi cover is multiplied by this so the animated street matches the still
 * (without changing the HTML still box).
 * 1 = raw cover; >1 pulls Pixi closer. Keep small — 1.035 overshot (too close).
 */
export const BG_STILL_MATCH_SCALE = 1.012;

type CanvasSize = { width: number; height: number };

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

/** Pixi Background scale — cover + still-match nudge. */
export const getBackgroundPixiScale = (canvas: CanvasSize) => {
	const scale = getBackgroundCoverScale(canvas);
	return {
		x: scale.x * BG_STILL_MATCH_SCALE,
		y: scale.y * BG_STILL_MATCH_SCALE,
	};
};

/**
 * Screen rect for the street plate — same footprint as Pixi `Background`
 * (centered, non-uniform cover). Loader still must use `object-fit: fill` here.
 */
export const getBackgroundCoverScreenBox = (canvas: CanvasSize) => {
	const scale = getBackgroundCoverScale(canvas);
	const width = BG_NATIVE.width * scale.x;
	const height = BG_NATIVE.height * scale.y;
	return {
		width,
		height,
		left: (canvas.width - width) * 0.5,
		top: (canvas.height - height) * 0.5,
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
