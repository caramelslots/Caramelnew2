/** First-open flow: preload Pixi board while loading, fade in after transition. */
export const gameEntrance = $state({
	/** Mount board/HUD off-screen while assets load or cloud transition plays. */
	preloadContent: false,
	/** Reveal game + HTML controls with a short entrance animation. */
	showContent: false,
	/** Loader info cards on the opening screen (hidden during cloud transition). */
	loadingCardsVisible: true,
	/**
	 * Drop HTML street still when clouds cover (theme-switch beat), not at press —
	 * so the still→Pixi swap is hidden under steam.
	 */
	hideLoaderStreet: false,
	/** Raise Pixi above the HTML still so loading clouds paint over it. */
	loadingCloudActive: false,
});
