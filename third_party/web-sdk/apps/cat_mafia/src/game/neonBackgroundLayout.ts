/**
 * Street background cover-fit (Pixi `mainBackground` + BootstrapLoader).
 */
import {
	LOADER_HTML_BG_OFFSET_X,
	LOADER_HTML_BG_OFFSET_Y,
	LOADER_HTML_BG_SCALE_X,
	LOADER_HTML_BG_SCALE_Y,
} from './constants';

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
 * day.webp loader still (1920×956) is slightly taller than the Spine plate (1920×940).
 * Pixi cover is multiplied by this so the animated street matches the still.
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

/** HTML loader still — same plate box as Pixi + LOADER_HTML_BG_SCALE_* (constants.ts). */
export const getBackgroundHtmlStillStyle = (canvas: CanvasSize) => {
	const plate = getBackgroundPixiCoverScreenBox(canvas);
	const sx = LOADER_HTML_BG_SCALE_X;
	const sy = LOADER_HTML_BG_SCALE_Y;
	const ox = LOADER_HTML_BG_OFFSET_X;
	const oy = LOADER_HTML_BG_OFFSET_Y;
	const transform =
		ox !== 0 || oy !== 0
			? `translate(${ox}px,${oy}px) scale(${sx},${sy})`
			: sx === sy
				? `scale(${sx})`
				: `scale(${sx},${sy})`;
	return [
		`left:${plate.left}px`,
		`top:${plate.top}px`,
		`width:${plate.width}px`,
		`height:${plate.height}px`,
		`transform:${transform}`,
		`transform-origin:center center`,
	].join(';');
};

/** @deprecated Use getBackgroundHtmlStillStyle — kept for callers expecting a box rect. */
export const getBackgroundCoverScreenBox = getBackgroundPixiCoverScreenBox;

/** Inline CSS for the loader HTML street plate (`position: absolute` child). */
export const getBackgroundCoverScreenBoxStyle = getBackgroundHtmlStillStyle;

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
