/**
 * Under-board WIN label — locked to the desk nameplate centre using the same
 * desk-slot math as BoardFrame (DESK_PARCHMENT + DESK_BOTTOM_PULL).
 *
 * Fractions of playfield height drift when the bottom rail is pulled; this
 * tracks the gold plate itself so PC / laptop / popout / phone stay put.
 */
import {
	BOARD_FRAME_OFFSET,
	BOARD_LAYOUT_SCALE,
	DESK_BOTTOM_PULL_PX,
	DESK_PARCHMENT,
	DESK_PARCHMENT_PADDING,
	DESK_VISUAL_OFFSET_Y,
	WIN_HUD_FONT_SIZE,
	BITMAP_FONT_SCALE,
} from './constants';
import { DUEL_NAMEPLATE } from './duelLayout';

type BoardLayoutLike = {
	x: number;
	y: number;
	width: number;
	height: number;
	scale: number;
	pivot: { x: number; y: number };
};

type MainLayoutLike = {
	x: number;
	y: number;
	width: number;
	height: number;
	scale: number;
};

/** Fine optical nudge inside the plate (fraction of pulled nameplate height, + = down). */
const WIN_IN_PLATE_Y_NUDGE_FRAC = 0.78;
const WIN_IN_PLATE_X_NUDGE_FRAC = 0;

/** Font size as a fraction of on-screen nameplate height (proxima-nova matches FS intro). */
const WIN_FONT_OF_PLATE_H = 1.12;

const deskSlotSize = (board: BoardLayoutLike) => ({
	width: (board.width * DESK_PARCHMENT_PADDING.width) / DESK_PARCHMENT.widthFrac,
	height: (board.height * DESK_PARCHMENT_PADDING.height) / DESK_PARCHMENT.heightFrac,
});

/** Unscaled desk-slot centre in board pivot space (matches BoardFrame). */
const deskSlotCenterLocal = (board: BoardLayoutLike, slot: { width: number; height: number }) => {
	const frameX = board.pivot.x + BOARD_FRAME_OFFSET.x;
	const frameY = board.pivot.y + BOARD_FRAME_OFFSET.y;
	return {
		x: frameX - DESK_PARCHMENT.offsetXFrac * slot.width - board.pivot.x,
		y: frameY - DESK_PARCHMENT.offsetYFrac * slot.height + DESK_VISUAL_OFFSET_Y - board.pivot.y,
	};
};

/**
 * MainContainer-local centre for under-board WIN text — sits on the nameplate
 * dark fill, not a fixed gap under the playfield.
 */
export const getWinHudLocalPos = (board: BoardLayoutLike) => {
	const slot = deskSlotSize(board);
	const slotCenter = deskSlotCenterLocal(board, slot);
	const pulledH = slot.height - DESK_BOTTOM_PULL_PX;

	const fx = DUEL_NAMEPLATE.left + DUEL_NAMEPLATE.width * 0.5;
	const fy = DUEL_NAMEPLATE.top + DUEL_NAMEPLATE.height * 0.5;

	// Top-anchored DESK_BOTTOM_PULL — top rail fixed, bottom (nameplate) lifts.
	const localX = slotCenter.x + (fx - 0.5) * slot.width;
	const localY = slotCenter.y - slot.height * 0.5 + fy * pulledH;

	const plateH = DUEL_NAMEPLATE.height * pulledH * board.scale;
	const plateW = DUEL_NAMEPLATE.width * slot.width * board.scale;

	return {
		x: board.x + localX * board.scale + plateW * WIN_IN_PLATE_X_NUDGE_FRAC,
		y: board.y + localY * board.scale + plateH * WIN_IN_PLATE_Y_NUDGE_FRAC,
		maxWidth: plateW * 0.92,
		plateHeight: plateH,
	};
};

/** Screen CSS box for the HTML under-board WIN (proxima-nova). */
export const getWinHudScreenBox = (opts: {
	mainLayout: MainLayoutLike;
	boardLayout: BoardLayoutLike;
}) => {
	const local = getWinHudLocalPos(opts.boardLayout);
	const ml = opts.mainLayout;
	const s = ml.scale;
	const plateHScreen = local.plateHeight * s;
	return {
		centerX: ml.x + (local.x - ml.width * 0.5) * s,
		centerY: ml.y + (local.y - ml.height * 0.5) * s,
		maxWidth: local.maxWidth * s,
		fontSize: Math.max(10, plateHScreen * WIN_FONT_OF_PLATE_H),
	};
};

/** @deprecated Prefer plate-relative sizing via getWinHudScreenBox. */
export const getWinHudFontSize = (boardScale: number) =>
	WIN_HUD_FONT_SIZE * BITMAP_FONT_SCALE * (boardScale / BOARD_LAYOUT_SCALE.desktop);

export const WIN_HUD_LAYOUT = {
	NAMEPLATE: DUEL_NAMEPLATE,
	IN_PLATE_Y_NUDGE_FRAC: WIN_IN_PLATE_Y_NUDGE_FRAC,
	IN_PLATE_X_NUDGE_FRAC: WIN_IN_PLATE_X_NUDGE_FRAC,
	FONT_OF_PLATE_H: WIN_FONT_OF_PLATE_H,
} as const;
