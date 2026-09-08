/**
 * Intro sky + roofs (1950×1339).
 *
 * Must NOT be fill-fitted into the 1920×940 Pixi plate — that squashes houses
 * ~1.42× on Y so they cannot meet the street at the lift seam.
 * Same horizontal plate as Pixi; Y scale matches the spine plate (940px);
 * bottom-aligned so the cut roofs sit on the seam.
 */
import {
	LOADER_HTML_BG_OFFSET_X,
	LOADER_HTML_BG_OFFSET_Y,
	LOADER_INTRO_PLATE_OFFSET_X,
	LOADER_INTRO_PLATE_OFFSET_Y,
	LOADER_INTRO_ROOFS_OVERLAP_PHONE_PX,
	LOADER_INTRO_ROOFS_OVERLAP_PX,
} from './constants';
import { getBackgroundPixiCoverScreenBox } from './neonBackgroundLayout';
import { isPhoneCanvasSizeType } from './streetOffscreenCull';

type CanvasSize = { width: number; height: number };

/** Designer intro plates (sky). */
export const INTRO_NATIVE = { width: 1950, height: 1339 };
/** Roofs + bottom blur (`градик.png`) — taller so the fade overlaps the Pixi street. */
export const INTRO_ROOFS_NATIVE = { width: 1950, height: 2291 };
/** Last painted row in градик.png (houses + fade). Below this is empty. */
export const INTRO_ROOFS_CONTENT_BOTTOM = 1423;
/** Designer clouds strip placed over sky, under roofs. */
export const INTRO_CLOUDS_NATIVE = { width: 1295, height: 356 };
/** Opaque spine street plate in source px — intro Y scale is matched to this. */
export const SPINE_PLATE_PX_H = 940;
/** Spine street attachment width — intro is baked at this texel density so LINEAR matches Pixi. */
export const SPINE_PLATE_PX_W = 1920;

export type LoaderIntroLayerBox = {
	left: number;
	top: number;
	width: number;
	height: number;
};

export const getLoaderIntroLayerBox = (canvas: CanvasSize): LoaderIntroLayerBox => {
	const plate = getBackgroundPixiCoverScreenBox(canvas);
	const width = plate.width;
	const height = plate.height * (INTRO_NATIVE.height / SPINE_PLATE_PX_H);
	return {
		left: plate.left + LOADER_HTML_BG_OFFSET_X + LOADER_INTRO_PLATE_OFFSET_X,
		top: canvas.height - height + LOADER_HTML_BG_OFFSET_Y + LOADER_INTRO_PLATE_OFFSET_Y,
		width,
		height,
	};
};

/**
 * Width-matched to the sky plate. Content bottom (y=1423) sits on the seam;
 * the empty 868px + fade hang onto the Pixi street.
 */
export const getLoaderIntroRoofsBox = (
	canvas: CanvasSize,
	canvasSizeType?: string,
): LoaderIntroLayerBox => {
	const box = getLoaderIntroLayerBox(canvas);
	const height = box.width * (INTRO_ROOFS_NATIVE.height / INTRO_ROOFS_NATIVE.width);
	const contentBottom = height * (INTRO_ROOFS_CONTENT_BOTTOM / INTRO_ROOFS_NATIVE.height);
	const overlapPx =
		canvasSizeType && isPhoneCanvasSizeType(canvasSizeType)
			? LOADER_INTRO_ROOFS_OVERLAP_PHONE_PX
			: LOADER_INTRO_ROOFS_OVERLAP_PX;
	return {
		left: box.left,
		top:
			canvas.height -
			contentBottom +
			overlapPx +
			LOADER_HTML_BG_OFFSET_Y +
			LOADER_INTRO_PLATE_OFFSET_Y,
		width: box.width,
		height,
	};
};

export const getLoaderIntroLayerStyle = (canvas: CanvasSize) => {
	const box = getLoaderIntroLayerBox(canvas);
	return [
		`left:${Math.round(box.left)}px`,
		`top:${Math.round(box.top)}px`,
		`width:${Math.round(box.width)}px`,
		`height:${Math.round(box.height)}px`,
	].join(';');
};

export const getLoaderIntroSkyStyle = getLoaderIntroLayerStyle;
export const getLoaderIntroRoofsStyle = getLoaderIntroLayerStyle;
