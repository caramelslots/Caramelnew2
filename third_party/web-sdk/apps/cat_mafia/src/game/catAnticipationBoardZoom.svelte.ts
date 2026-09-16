import { cubicInOut, cubicOut } from 'svelte/easing';
import { Tween } from 'svelte/motion';

import {
	CAT_SLOW_BACKGROUND_ZOOM,
	CAT_SLOW_BACKGROUND_ZOOM_RAMP_OUT_RATIO,
	CAT_SLOW_BOARD_ZOOM,
	CAT_SLOW_ZOOM_RAMP_OUT_RATIO,
	clampCatSlowZoomRampOutMs,
	estimateCatSlowPhaseRemainingMs,
	estimateCatSlowReelSpinMs,
} from './catAnticipation';
import { scaleMsByGameSpeed } from './gameSpeed';
import { stateGame } from './stateGame.svelte';

/** Uniform board zoom multiplier (Board + BoardFrame). */
export const catBoardZoom = new Tween(1);

/** Canvas-centered background zoom (street spine + desk). */
export const catBackgroundZoom = new Tween(1);

let slowPhaseStartMs = 0;
let lastSlowPhaseDurationMs = 0;
let rafId: number | null = null;

const isSlowReelActive = (reelIndex: number) => {
	const motion = stateGame.board[reelIndex].reelState.motion;
	return motion === 'spinning' || motion === 'bouncing';
};

const getSlowPhaseProgress = (elapsedMs: number, stillSlowing: boolean): number => {
	if (!stillSlowing) return 1;

	const remainingMs = estimateCatSlowPhaseRemainingMs({
		slowReels: stateGame.catSlowReels,
		elapsedSinceStartMs: elapsedMs,
		gameSpeed: stateGame.gameSpeed,
		getReelMotion: (reelIndex) => stateGame.board[reelIndex].reelState.motion,
	});
	const durationMs = elapsedMs + remainingMs;
	const linearProgress = durationMs > 0 ? elapsedMs / durationMs : 0;

	return cubicOut(Math.min(0.995, linearProgress));
};

const applyZoom = (progress: number) => {
	const boardZoom = 1 + (CAT_SLOW_BOARD_ZOOM - 1) * progress;
	const backgroundZoom = 1 + (CAT_SLOW_BACKGROUND_ZOOM - 1) * progress;

	void catBoardZoom.set(boardZoom, { duration: 0 });
	void catBackgroundZoom.set(backgroundZoom, { duration: 0 });
};

const releaseZoom = () => {
	const slowPhaseMs =
		lastSlowPhaseDurationMs > 0
			? lastSlowPhaseDurationMs
			: estimateCatSlowReelSpinMs(stateGame.gameSpeed);
	const boardOutMs = scaleMsByGameSpeed(
		clampCatSlowZoomRampOutMs(slowPhaseMs, CAT_SLOW_ZOOM_RAMP_OUT_RATIO),
		stateGame.gameSpeed,
	);
	const backgroundOutMs = scaleMsByGameSpeed(
		clampCatSlowZoomRampOutMs(slowPhaseMs, CAT_SLOW_BACKGROUND_ZOOM_RAMP_OUT_RATIO),
		stateGame.gameSpeed,
	);

	void catBoardZoom.set(1, { duration: boardOutMs, easing: cubicInOut });
	void catBackgroundZoom.set(1, { duration: backgroundOutMs, easing: cubicInOut });
};

const tick = () => {
	rafId = null;
	const slowReels = stateGame.catSlowReels;

	if (slowReels.length === 0) return;

	const elapsedMs = performance.now() - slowPhaseStartMs;
	const stillSlowing = slowReels.some(isSlowReelActive);
	const progress = getSlowPhaseProgress(elapsedMs, stillSlowing);

	applyZoom(progress);

	if (!stillSlowing) {
		lastSlowPhaseDurationMs = Math.max(elapsedMs, 1);
		return;
	}

	rafId = requestAnimationFrame(tick);
};

export const startCatBoardZoomRamp = () => {
	if (rafId !== null) return;
	lastSlowPhaseDurationMs = 0;
	slowPhaseStartMs = performance.now();
	rafId = requestAnimationFrame(tick);
};

export const stopCatBoardZoomRamp = () => {
	if (rafId !== null) {
		cancelAnimationFrame(rafId);
		rafId = null;
	}
	slowPhaseStartMs = 0;
	releaseZoom();
};
