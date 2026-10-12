import { BIG_WIN_DIM_ALPHA } from './constants';
import { stateGame } from './stateGame.svelte';

/**
 * Dim strength for HTML HUD / chrome under big-win.
 * Total Win covers HUD via raised Pixi (`fsOutroActive`) — no CSS dim there.
 * Scene dim can be stronger (FS outro 0.85); keep HUD readable at big-win strength.
 */
export const hudWinDimAlpha = () => {
	if (stateGame.fsOutroActive) return 0;
	const alpha = stateGame.overlayDimAlpha;
	if (alpha <= 0) return 0;
	return Math.min(alpha, BIG_WIN_DIM_ALPHA);
};

export const hudWinDimStyle = (opts?: { blockPointer?: boolean }) => {
	const alpha = hudWinDimAlpha();
	if (alpha <= 0) return '';
	const pointer = opts?.blockPointer ? 'pointer-events:none;' : '';
	return `filter:brightness(${1 - alpha});${pointer}`;
};
