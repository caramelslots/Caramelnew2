import type { Spine } from '@esotericsoftware/spine-pixi-v8';

import { SPINE_NATIVE } from './neonBackgroundLayout';
import type { NeonElementTuning } from './neonBackgroundTuning';

/**
 * Native size of the `board` mesh attachment in the neon Spine atlas.
 * Measured from skeleton.json vertices bbox: x ±313, y ±268 → 626×537.
 * Rounded to the stored 'width'/'height' values.
 */
export const NEON_BOARD_NATIVE = { width: 621, height: 534 } as const;

export type NeonOverlayTransform = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type BoardCanvasBounds = {
	centerX: number;
	centerY: number;
	width: number;
	height: number;
};

type MainLayout = {
	x: number;
	y: number;
	scale: number;
	width: number;
	height: number;
};

type BoardLayout = {
	x: number;
	y: number;
	scale: number;
	width: number;
	height: number;
};

/**
 * Computes the board center and size in canvas pixels.
 *
 * Coordinate chain (mirrors BoardContainer.svelte):
 *   canvas ← MainContainer(x, y, scale) ← board(x, y, scale)
 *
 * boardLayout.x / .y  — board center in main-layout design-px (1920×1080 etc.)
 * mainLayout.x / .y   — canvas center of the MainContainer (canvasWidth/2, canvasHeight/2)
 */
export const getBoardCanvasBounds = (
	mainLayout: MainLayout,
	boardLayout: BoardLayout,
): BoardCanvasBounds => {
	// Board center in canvas pixels
	const canvasCenterX =
		mainLayout.x + (boardLayout.x - mainLayout.width * 0.5) * mainLayout.scale;
	const canvasCenterY =
		mainLayout.y + (boardLayout.y - mainLayout.height * 0.5) * mainLayout.scale;

	const totalScale = mainLayout.scale * boardLayout.scale;

	return {
		centerX: canvasCenterX,
		centerY: canvasCenterY,
		width: boardLayout.width * totalScale,
		height: boardLayout.height * totalScale,
	};
};

/**
 * Each frame: moves the `board` bone so the neon glow outline
 * sits exactly over the game board.
 *
 * The Spine skeleton's Y-axis is flipped vs. canvas (Spine +y = up).
 * SpineProvider already applies uniform scale; we only need to compute
 * bone-local coordinates from canvas coordinates.
 *
 * tuning — NEON_BOARD_ALIGNMENT from neonBackgroundTuning.ts.
 */
export const alignNeonBoardBone = (
	spine: Spine,
	overlay: NeonOverlayTransform,
	board: BoardCanvasBounds,
	tuning: NeonElementTuning,
) => {
	const boardBone = spine.skeleton.findBone('board');
	if (!boardBone) return;

	// px per Spine design-unit (from SpineProvider width / skeleton width)
	const spineScale = overlay.width / SPINE_NATIVE.width;

	// SpineProvider uses anchor=0.5 → pivot = (overlayWidth/2, overlayHeight/2) in local Spine units.
	// Pixi formula: canvas = overlayPos + (bonePos - pivot) * scale
	// Spine Y is flipped: canvas_y = overlayY + (-bone_y - pivotY) * scale
	// Inverse → bone position:
	const pivotX = overlay.width / 2;
	const pivotY = overlay.height / 2;

	const localX = (board.centerX - overlay.x) / spineScale + pivotX + (tuning.x ?? 0);
	const localY = -(board.centerY - overlay.y) / spineScale - pivotY + (tuning.y ?? 0);

	// Scale so NEON_BOARD_NATIVE fills the board area
	const scaleX = (board.width / spineScale / NEON_BOARD_NATIVE.width) * (tuning.scaleX ?? 1);
	const scaleY = (board.height / spineScale / NEON_BOARD_NATIVE.height) * (tuning.scaleY ?? 1);

	boardBone.x = localX;
	boardBone.y = localY;
	boardBone.scaleX = scaleX;
	boardBone.scaleY = scaleY;
};
