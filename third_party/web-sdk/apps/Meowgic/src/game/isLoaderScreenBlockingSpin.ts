import { gameEntrance } from './gameEntrance.svelte';

/**
 * True while the opening loader still owns Space (Press to Continue).
 *
 * Do NOT key off a sticky `showLoadingScreen` alone, and do NOT use bare
 * `!liftComplete`: an interrupted entrance / HMR can leave `showContent`
 * true (click-spin works) while `liftComplete` stays false (Space dead).
 *
 * HUD Space is gated with `!show` until Continue; this flag only covers the
 * cards screen where Space must dismiss the loader instead of betting.
 */
export const isLoaderScreenBlockingSpin = (showLoadingScreen?: boolean) =>
	Boolean(showLoadingScreen) &&
	gameEntrance.loadingCardsVisible &&
	!gameEntrance.liftComplete;
