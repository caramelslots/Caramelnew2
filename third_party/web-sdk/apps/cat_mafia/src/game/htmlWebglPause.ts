import { stateGame } from './stateGame.svelte';

/**
 * Pixi stage sits above HTML (z-index 50) during big-win overlay and the
 * FS cloud. Pause HTML SpinePlayers that are covered then (spin button,
 * coin hub). The mascot stays in its normal layer and keeps playing.
 */
export const isHtmlWebglPaused = () =>
	stateGame.winOverlayActive || stateGame.transitionActive;
