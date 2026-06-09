/** First-open flow: preload Pixi board while loading, fade in after transition. */
export const gameEntrance = $state({
	/** Mount board/HUD off-screen while assets load or cloud transition plays. */
	preloadContent: false,
	/** Reveal game + HTML controls with a short entrance animation. */
	showContent: false,
});
