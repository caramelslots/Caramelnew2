/** First-open flow: preload Pixi board while loading, dissolve in after card exit. */
export const gameEntrance = $state({
	/** Mount board/HUD off-screen while assets load or exit overlay plays. */
	preloadContent: false,
	/** Reveal game + HTML controls with a short entrance animation. */
	showContent: false,
	/** Loader info cards on the opening screen (hidden once exit starts). */
	loadingCardsVisible: true,
	/** Drop HTML street still at press — duplicate overlay covers the handoff. */
	hideLoaderStreet: false,
	/** Cards slide down while the duplicate street plate dissolves over the slot. */
	loaderExitActive: false,
});
