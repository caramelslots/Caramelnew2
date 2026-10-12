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
	LOADER_INTRO_ROOFS_OVERLAP_NATIVE_PX,
} from './constants';
import { getBackgroundPixiCoverScreenBox } from './neonBackgroundLayout';

type CanvasSize = { width: number; height: number };

/** Designer intro plates (sky). */
export const INTRO_NATIVE = { width: 1950, height: 1339 };
/** Roofs + bottom blur (`градик.png`) — taller so the fade overlaps the Pixi street. */
export const INTRO_ROOFS_NATIVE = { width: 1950, height: 2291 };
/**
 * Last painted row in intro_roofs.png (houses + soft fade). Below this is empty.
 * Fade runs ~1340–1360; do not use a row inside the empty pad — a fixed CSS
 * overlap then pushes opaque roofs onto the Pixi street on short viewports.
 */
export const INTRO_ROOFS_CONTENT_BOTTOM = 1360;
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
 * Same plate width + Y scale as sky/Pixi (spine 940). Content bottom sits on the
 * seam; a plate-scaled soft-fade hang covers the stitch on every aspect ratio.
 */
export const getLoaderIntroRoofsBox = (canvas: CanvasSize): LoaderIntroLayerBox => {
	const plate = getBackgroundPixiCoverScreenBox(canvas);
	const box = getLoaderIntroLayerBox(canvas);
	const height = plate.height * (INTRO_ROOFS_NATIVE.height / SPINE_PLATE_PX_H);
	const contentBottom = height * (INTRO_ROOFS_CONTENT_BOTTOM / INTRO_ROOFS_NATIVE.height);
	const overlapPx = (plate.height / SPINE_PLATE_PX_H) * LOADER_INTRO_ROOFS_OVERLAP_NATIVE_PX;
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
