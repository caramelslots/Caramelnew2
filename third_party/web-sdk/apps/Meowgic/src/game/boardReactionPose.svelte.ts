/**
 * Live `main_board` scale from the desk spine (`reaction/reaction`).
 * Symbols are not on that bone, so BoardContainer copies this scale
 * around the same origin the spine scales the playfield from.
 */
import {
	BOARD_DESK_CONTENT,
	BOARD_FRAME_OFFSET,
	DESK_BOTTOM_PULL_PX,
	DESK_PARCHMENT,
	DESK_PARCHMENT_PADDING,
	DESK_VISUAL_OFFSET_Y,
} from './constants';

/**
 * Setup pose of the `board` bone (parent of `main_board`) in skeleton space, Y-up.
 * `main_board` has no local translation, so this is the scale origin.
 */
const MAIN_BOARD_ORIGIN = { x: -16.082275, y: -25.4244 } as const;

export const boardReactionPose = $state({
	/** 1 at rest. Peaks with the spin reaction (mixed, so under the raw 1.091 key). */
	scale: 1,
});

type BoardLocalLayout = {
	width: number;
	height: number;
	pivot: { x: number; y: number };
};

/**
 * `main_board` origin in board-local px (inside the −pivot container).
 * Matches BoardFrame: slot center → spine root → yDown draw of the bone.
 */
export const getBoardReactionPivot = (layout: BoardLocalLayout) => {
	const slotW = (layout.width * DESK_PARCHMENT_PADDING.width) / DESK_PARCHMENT.widthFrac;
	const slotH = (layout.height * DESK_PARCHMENT_PADDING.height) / DESK_PARCHMENT.heightFrac;
	const contentScaleX = slotW / BOARD_DESK_CONTENT.width;
	const contentScaleY = (slotH - DESK_BOTTOM_PULL_PX) / BOARD_DESK_CONTENT.height;
	const contentRootX = -BOARD_DESK_CONTENT.centerX * contentScaleX;
	const contentRootY = BOARD_DESK_CONTENT.centerY * contentScaleY - DESK_BOTTOM_PULL_PX / 2;
	const frameX = layout.pivot.x + BOARD_FRAME_OFFSET.x;
	const frameY = layout.pivot.y + BOARD_FRAME_OFFSET.y;
	const slotCenterX = frameX - DESK_PARCHMENT.offsetXFrac * slotW;
	const slotCenterY = frameY - DESK_PARCHMENT.offsetYFrac * slotH + DESK_VISUAL_OFFSET_Y;

	return {
		x: slotCenterX + contentRootX + MAIN_BOARD_ORIGIN.x * contentScaleX,
		y: slotCenterY + contentRootY - MAIN_BOARD_ORIGIN.y * contentScaleY,
	};
};

const samplerScales = new Map<number, number>();
let samplerSeq = 1;

export const acquireBoardReactionSampler = () => samplerSeq++;

const publishCombined = () => {
	let next = 1;
	for (const value of samplerScales.values()) {
		if (Math.abs(value - 1) > Math.abs(next - 1)) next = value;
	}
	if (Math.abs(next - 1) < 0.0008) next = 1;
	if (boardReactionPose.scale !== next) boardReactionPose.scale = next;
};

/** One desk spine reports its current `main_board` local scale (setup = 1). */
export const publishBoardReactionScale = (id: number, scale: number) => {
	const prev = samplerScales.get(id);
	if (prev !== undefined && Math.abs(prev - scale) < 0.0004) return;
	samplerScales.set(id, scale);
	publishCombined();
};

export const releaseBoardReactionSampler = (id: number) => {
	if (!samplerScales.delete(id)) return;
	publishCombined();
};
