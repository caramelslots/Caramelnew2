import type { GameType, RawSymbol } from './types';
import {
	BOARD_DIMENSIONS,
	INITIAL_BOARD,
	isVisibleBoardSymbolIndex,
	SPIN_OPTIONS_DEFAULT,
	SYMBOL_SIZE,
} from './constants';
import { gameSpeedMultFor, scaleMsByGameSpeed, type GameSpeedLevel } from './gameSpeed';
import { getSymbolX } from './utils';
import type { SpinningReelMotion } from 'utils-slots';

/** Scroll speed multiplier for reels after the 2nd cat lands (basegame only). */
export const REEL_SCROLL_SPEED_MULT_CAT = 0.35;

/** Extra padding rows on cat-slow reels (= one visible-grid rotation, 5 symbols). */
export const CAT_SLOW_EXTRA_SYMBOL_ROWS = BOARD_DIMENSIONS.y;

/** Board scale at peak cat slow-down (1 = no zoom). */
export const CAT_SLOW_BOARD_ZOOM = 1.025;

/** Background scale at peak cat slow-down (1 = no zoom). */
export const CAT_SLOW_BACKGROUND_ZOOM = 1.3;

/**
 * Zoom-out duration as a fraction of the measured cat slow phase.
 * Board and background share the same slow-phase clock; background can use a
 * longer out ratio when its zoom delta is larger.
 */
export const CAT_SLOW_ZOOM_RAMP_OUT_RATIO = 0.4;
export const CAT_SLOW_BACKGROUND_ZOOM_RAMP_OUT_RATIO = 0.55;

/** Min/max zoom-out duration (ms) after slow phase ends. */
export const CAT_SLOW_ZOOM_RAMP_OUT_MIN_MS = 800;
export const CAT_SLOW_ZOOM_RAMP_OUT_MAX_MS = 800;

/**
 * First slow reel is often mid-spin when the trigger reel stops.
 * 0.5 ≈ half a cat-slow reel duration remains for reel order 0.
 */
export const CAT_SLOW_ZOOM_FIRST_REEL_REMAINING_RATIO = 0.5;

/** Overhead (ms) in reel main-slide duration estimate — see constants.ts REEL_SPEED note. */
const REEL_MAIN_SLIDE_OVERHEAD_MS = 728;

/** Estimate one cat-slow reel stop (main slide + settle) at current game speed. */
export const estimateCatSlowReelSpinMs = (gameSpeed: GameSpeedLevel): number => {
	const reelLength = INITIAL_BOARD[0].length;
	const paddingRows =
		reelLength * SPIN_OPTIONS_DEFAULT.reelPaddingMultiplierNormal + CAT_SLOW_EXTRA_SYMBOL_ROWS;
	const scrollSpeedPxPerMs =
		SPIN_OPTIONS_DEFAULT.reelSpinSpeed * REEL_SCROLL_SPEED_MULT_CAT * gameSpeedMultFor(gameSpeed);
	const mainSlideMs =
		(REEL_MAIN_SLIDE_OVERHEAD_MS + SYMBOL_SIZE * paddingRows) / scrollSpeedPxPerMs;
	const settleMs = scaleMsByGameSpeed(SPIN_OPTIONS_DEFAULT.reelLandSquashRecoveryMs, gameSpeed);
	return Math.round(mainSlideMs + settleMs);
};

/** Remaining slow-phase time from reel motion + left-to-right stop cascade. */
export const estimateCatSlowPhaseRemainingMs = ({
	slowReels,
	elapsedSinceStartMs,
	gameSpeed,
	getReelMotion,
}: {
	slowReels: number[];
	elapsedSinceStartMs: number;
	gameSpeed: GameSpeedLevel;
	getReelMotion: (reelIndex: number) => SpinningReelMotion;
}): number => {
	const perReelMs = estimateCatSlowReelSpinMs(gameSpeed);
	const settleMs = scaleMsByGameSpeed(SPIN_OPTIONS_DEFAULT.reelLandSquashRecoveryMs, gameSpeed);

	let maxRemaining = 0;
	slowReels.forEach((reelIndex, order) => {
		const motion = getReelMotion(reelIndex);
		if (motion === 'stopped') return;

		const expectedStopAtMs = (order + CAT_SLOW_ZOOM_FIRST_REEL_REMAINING_RATIO) * perReelMs;
		const remaining =
			motion === 'bouncing' ? settleMs : Math.max(settleMs, expectedStopAtMs - elapsedSinceStartMs);

		maxRemaining = Math.max(maxRemaining, remaining);
	});

	return maxRemaining;
};

export const clampCatSlowZoomRampOutMs = (slowPhaseDurationMs: number, ratio: number): number =>
	Math.round(
		Math.min(
			CAT_SLOW_ZOOM_RAMP_OUT_MAX_MS,
			Math.max(CAT_SLOW_ZOOM_RAMP_OUT_MIN_MS, slowPhaseDurationMs * ratio),
		),
	);

/** `main_effect` bone at setup pose — reel-column VFX origin in skeleton design px. */
export const OUTLINE_REEL_MAIN_EFFECT = { x: 119.94, y: -56.31 } as const;

/**
 * One reel-column VFX bounds inside the full-screen skeleton (`main_effect` + mask),
 * in skeleton design px — not the 1922×1074 canvas size.
 */
export const OUTLINE_REEL_EFFECT = {
	width: 135,
	height: 510,
} as const;

/** Fine-tune outline reel spine placement (canvas px). Negative offsetY = up. */
export const OUTLINE_REEL_TUNING = {
	offsetX: 0,
	offsetY: -110,
	widthExtra: 7,
	heightExtra: 10,
} as const;

/** Target size for one slow reel column on the board. */
export const getOutlineReelColumnMetrics = () => {
	const visibleHeight = SYMBOL_SIZE * BOARD_DIMENSIONS.y;
	const height = visibleHeight + OUTLINE_REEL_TUNING.heightExtra;
	return {
		width: SYMBOL_SIZE + OUTLINE_REEL_TUNING.widthExtra,
		height,
		/** Center of visible row centers (y = 0.5..4.5 × symbol size). */
		centerY: visibleHeight / 2,
	};
};

/** Layout for one slow-reel outline instance (board-local coordinates). */
export const getOutlineReelLayout = (reelIndex: number) => {
	const column = getOutlineReelColumnMetrics();
	const scaleX = column.width / OUTLINE_REEL_EFFECT.width;
	const scaleY = column.height / OUTLINE_REEL_EFFECT.height;

	return {
		x: getSymbolX(reelIndex) + OUTLINE_REEL_TUNING.offsetX,
		y: column.centerY + OUTLINE_REEL_TUNING.offsetY,
		spineX: -OUTLINE_REEL_MAIN_EFFECT.x * scaleX,
		spineY: -OUTLINE_REEL_MAIN_EFFECT.y * scaleY,
		scale: { x: scaleX, y: scaleY },
	};
};

/** Bonus (B) symbols on the visible grid only — excludes RGS top/bottom padding rows. */
const countVisibleBonusOnReel = (reel: RawSymbol[]) =>
	reel.filter(
		(symbol, index) => isVisibleBoardSymbolIndex(index, reel.length) && symbol.name === 'B',
	).length;

/**
 * Index of the reel that completes the 2nd visible cat (B) on the result board,
 * or -1 when anticipation should not run (freegame, <2 cats, or no reels left).
 */
export const computeCatSlowTriggerReel = (board: RawSymbol[][], gameType: GameType): number => {
	if (gameType !== 'basegame') return -1;

	const reelCount = board.length;
	let catsFound = 0;

	for (let reelIndex = 0; reelIndex < reelCount; reelIndex++) {
		catsFound += countVisibleBonusOnReel(board[reelIndex]);
		if (catsFound >= 2 && reelIndex + 1 < reelCount) return reelIndex;
	}

	return -1;
};

/** Reel indices that should slow down once `triggerReelIndex` has stopped. */
export const catSlowReelsAfterTrigger = (triggerReelIndex: number, reelCount: number): number[] => {
	if (triggerReelIndex < 0 || triggerReelIndex + 1 >= reelCount) return [];
	return Array.from(
		{ length: reelCount - triggerReelIndex - 1 },
		(_, i) => triggerReelIndex + 1 + i,
	);
};
