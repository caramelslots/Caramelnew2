import type { GameType, RawSymbol } from './types';
import { BOARD_MASK_SPIN_OVERFLOW, BOARD_SIZES } from './constants';

/** Scroll speed multiplier for reels after the 2nd cat lands (basegame only). */
export const REEL_SCROLL_SPEED_MULT_CAT = 0.55;

/** Native pixel size of `cat_anticipation_frame.webp` (designer asset). */
const CAT_ANTICIPATION_FRAME_NATIVE = { width: 340, height: 1473 } as const;

/** Layout for the neon reel frame overlay during cat slow-down. */
export const CAT_ANTICIPATION_FRAME_LAYOUT = {
	native: CAT_ANTICIPATION_FRAME_NATIVE,
	fadeInMs: 220,
	scaleFrom: 0.94,
} as const;

/** Frame size aligned to the full board playfield (top edge y=0 → bottom mask edge). */
export const getCatAnticipationFrameMetrics = () => {
	const height =
		BOARD_SIZES.height + BOARD_MASK_SPIN_OVERFLOW.top + BOARD_MASK_SPIN_OVERFLOW.bottom;
	const aspect = CAT_ANTICIPATION_FRAME_NATIVE.width / CAT_ANTICIPATION_FRAME_NATIVE.height;
	return {
		height,
		width: height * aspect,
		centerY: height / 2,
	};
};

/**
 * Index of the reel that completes the 2nd cat (B) on the result board,
 * or -1 when anticipation should not run (freegame, <2 cats, or no reels left).
 */
export const computeCatSlowTriggerReel = (
	board: RawSymbol[][],
	gameType: GameType,
): number => {
	if (gameType !== 'basegame') return -1;

	const reelCount = board.length;
	let catsFound = 0;

	for (let reelIndex = 0; reelIndex < reelCount; reelIndex++) {
		catsFound += board[reelIndex].filter((symbol) => symbol.name === 'B').length;
		if (catsFound >= 2 && reelIndex + 1 < reelCount) return reelIndex;
	}

	return -1;
};

/** Reel indices that should slow down once `triggerReelIndex` has stopped. */
export const catSlowReelsAfterTrigger = (triggerReelIndex: number, reelCount: number): number[] => {
	if (triggerReelIndex < 0 || triggerReelIndex + 1 >= reelCount) return [];
	return Array.from({ length: reelCount - triggerReelIndex - 1 }, (_, i) => triggerReelIndex + 1 + i);
};
