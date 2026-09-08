/** First-open flow: slot preloads below intro panel, lift reveals it on continue. */
export const gameEntrance = $state({
	/** Mount board in the lower game panel while assets load. */
	preloadContent: false,
	/** Reveal HUD + mascot + sound when the user presses continue (lift starts). */
	showContent: false,
	/** Logo + progress splash dismissed — unlock cards + press to continue. */
	bootstrapDismissed: false,
	/** Loader info cards on the opening screen (hidden once exit starts). */
	loadingCardsVisible: true,
	/** Vertical lift animation is running. */
	loaderExitActive: false,
	/** Intro panel removed — game uses normal single-panel layout. */
	liftComplete: false,
});
