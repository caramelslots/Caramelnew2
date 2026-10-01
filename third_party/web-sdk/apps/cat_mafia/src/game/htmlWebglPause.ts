import { stateGame } from './stateGame.svelte';

/**
 * Pixi stage sits above HTML during the FS cloud and Total Win.
 * Pause HTML SpinePlayers that are covered then (spin button, coin hub).
 */
export const isHtmlWebglPaused = () =>
	stateGame.transitionActive || stateGame.fsOutroActive;
