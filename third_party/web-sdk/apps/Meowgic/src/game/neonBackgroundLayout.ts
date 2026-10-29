/**
 * Street background cover-fit. One Pixi scene for the opening screen and the slot.
 */

/**
 * Combined scene AABB from the split designer export (`bg_only` plate is the
 * cover reference; platform + table share the same root origin).
 */
export const SPINE_NATIVE = { width: 1920, height: 940 };
export const SPINE_BOUNDS = { x: -960, y: -469.21, width: 1920, height: 940 };

/**
 * Opaque room plate (`background` / `background2` skin slots) in world units.
 * Used for cover-fit so the painted plate fills the canvas (no letterbox).
 */
const BG_ROOT_SCALE = 1;
const BG_PLATE_ATTACH_SCALE = 1;
const BG_PLATE_PX = { width: 1920, height: 940 };
export const BG_NATIVE = {
	width: BG_PLATE_PX.width * BG_PLATE_ATTACH_SCALE * BG_ROOT_SCALE,
	height: BG_PLATE_PX.height * BG_PLATE_ATTACH_SCALE * BG_ROOT_SCALE,
};

export const BG_Y_OFFSET = 0;

/** Basegame / bonus theme skins on each background piece. */
export type BackgroundThemeSkin = 'purple' | 'green';

/** Room plate idle (track 0 on `mainBackground` / `bgTable`). */
export const BG_IDLE_ANIMATION = 'idle/idle_bg';

/** Extra looping tracks on `mainBackground` (room lamps + particles). */
export const BG_ONLY_IDLE_TRACKS = [
	{ trackIndex: 1, animationName: 'idle/lamps' },
	{ trackIndex: 2, animationName: 'idle/particles' },
] as const;

/** Extra looping tracks on `bgTable` (desk props). */
export const BG_TABLE_IDLE_TRACKS = [
	{ trackIndex: 1, animationName: 'idle/candle' },
	{ trackIndex: 2, animationName: 'idle/orb' },
	{ trackIndex: 3, animationName: 'idle/pen' },
	{ trackIndex: 4, animationName: 'idle/lamps' },
] as const;

/**
 * < 1 zooms the street out horizontally so more of the scene fits.
 * 1 = tight cover on the opaque plate. ~0.88 shows ~12% more width.
 */
export const BG_VIEW_ZOOM = 0.95;

/** Fine scale on the cover-fit so the plate fills the canvas without a seam. */
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
 * Screen rect for the Pixi street plate (centered, non-uniform cover + still-match).
 */
export const getBackgroundPixiCoverScreenBox = (canvas: CanvasSize) => {
	const scale = getBackgroundPixiScale(canvas);
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
 * Pixi street spine Y — cover-fit plate is slightly taller than the canvas,
 * so center would clip the top stitch row; shift so the plate top sits on the panel.
 */
export const getBackgroundSpineY = (canvas: CanvasSize) => {
	const plate = getBackgroundPixiCoverScreenBox(canvas);
	return plate.height * 0.5;
};

/** @deprecated Use getBackgroundSpineY */
export const getLoaderLiftGameSpineY = getBackgroundSpineY;

/** @deprecated Use getBackgroundPixiCoverScreenBox */
export const getBackgroundCoverScreenBox = getBackgroundPixiCoverScreenBox;

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
