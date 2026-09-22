/**
 * Under-board WIN label — locked to the desk nameplate via board-size fractions
 * (same idea as barrel_rim / fsCounterLayout).
 *
 * Tuned so desktop (BOARD_LAYOUT_SCALE.desktop) matches the previous
 * `height/2 + 84` game-px spot; other layouts inherit the same relative seat.
 */
import { BOARD_LAYOUT_SCALE, BOARD_SIZES } from './constants';

/** On-screen board size at the PC reference scale. */
const REF_BOARD_W = BOARD_SIZES.width * BOARD_LAYOUT_SCALE.desktop;
const REF_BOARD_H = BOARD_SIZES.height * BOARD_LAYOUT_SCALE.desktop;

/**
 * Gap from playfield bottom → WIN centre as a fraction of visualHeight.
 * Desktop was `unscaled half + 84` ≈ visualHalf + 40 @ scale 1.22.
 */
const WIN_BELOW_BOTTOM_FRAC = 40 / REF_BOARD_H;

/**
 * Horizontal offset from board centre as a fraction of visualWidth.
 * Desktop was layout-center − 28 → board.x − 8 @ offset.x −20.
 */
const WIN_X_OFFSET_FRAC = -8 / REF_BOARD_W;

type BoardLayoutLike = {
	x: number;
	y: number;
	visualWidth: number;
	visualHeight: number;
};

/** MainContainer-local centre for under-board WIN text. */
export const getWinHudLocalPos = (board: BoardLayoutLike) => ({
	x: board.x + board.visualWidth * WIN_X_OFFSET_FRAC,
	y: board.y + board.visualHeight * (0.5 + WIN_BELOW_BOTTOM_FRAC),
});

export const WIN_HUD_LAYOUT = {
	BELOW_BOTTOM_FRAC: WIN_BELOW_BOTTOM_FRAC,
	X_OFFSET_FRAC: WIN_X_OFFSET_FRAC,
} as const;
