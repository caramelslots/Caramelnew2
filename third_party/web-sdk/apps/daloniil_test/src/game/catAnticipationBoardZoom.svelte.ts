import { Tween } from 'svelte/motion';

import {
	CAT_SLOW_BACKGROUND_ZOOM,
	CAT_SLOW_BOARD_ZOOM,
	CAT_SLOW_BOARD_ZOOM_RAMP_MS,
} from './catAnticipation';
import { scaleMsByGameSpeed } from './gameSpeed';
import { stateGame } from './stateGame.svelte';

/** Uniform board zoom multiplier (Board + BoardFrame). */
export const catBoardZoom = new Tween(1);

/** Canvas-centered background zoom (sprite + neon behind + lanterns). */
export const catBackgroundZoom = new Tween(1);

let rampStartMs = 0;
let rafId: number | null = null;

const isSlowReelActive = (reelIndex: number) => {
	const motion = stateGame.board[reelIndex].reelState.motion;
	return motion === 'spinning' || motion === 'bouncing';
};

const tick = () => {
	rafId = null;
	const slowReels = stateGame.catSlowReels;

	if (slowReels.length === 0) {
		rampStartMs = 0;
		void catBoardZoom.set(1, { duration: 0 });
		void catBackgroundZoom.set(1, { duration: 0 });
		return;
	}

	if (rampStartMs === 0) rampStartMs = performance.now();

	const elapsed = performance.now() - rampStartMs;
	const rampMs = scaleMsByGameSpeed(CAT_SLOW_BOARD_ZOOM_RAMP_MS, stateGame.gameSpeed);
	const stillSlowing = slowReels.some(isSlowReelActive);

	// Smooth ramp while reels spin; reach full zoom when the slow phase ends.
	const progress = stillSlowing
		? Math.min(0.99, 1 - Math.exp(-elapsed / rampMs))
		: 1;
	const boardZoom = 1 + (CAT_SLOW_BOARD_ZOOM - 1) * progress;
	const backgroundZoom = 1 + (CAT_SLOW_BACKGROUND_ZOOM - 1) * progress;

	void catBoardZoom.set(boardZoom, { duration: 0 });
	void catBackgroundZoom.set(backgroundZoom, { duration: 0 });
	rafId = requestAnimationFrame(tick);
};

export const startCatBoardZoomRamp = () => {
	if (rafId !== null) return;
	if (rampStartMs === 0) rampStartMs = performance.now();
	rafId = requestAnimationFrame(tick);
};

export const stopCatBoardZoomRamp = () => {
	if (rafId !== null) {
		cancelAnimationFrame(rafId);
		rafId = null;
	}
	rampStartMs = 0;
	void catBoardZoom.set(1, { duration: 0 });
	void catBackgroundZoom.set(1, { duration: 0 });
};
