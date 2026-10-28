/** First-open flow: street + cards, then steam transition reveals the slot. */
export const gameEntrance = $state({
	/** Mount board (hidden) while assets load under the cards. */
	preloadContent: false,
	/** Reveal HUD + mascot + sound when steam covers on Continue. */
	showContent: false,
	/** Logo + progress splash dismissed — unlock cards + press to continue. */
	bootstrapDismissed: false,
	/** Loader info cards on the opening screen (hidden once exit starts). */
	loadingCardsVisible: true,
	/** Steam exit is running after Continue. */
	loaderExitActive: false,
	/** @deprecated Intro sky fade — kept for DevButtons reset compatibility. */
	introFading: false,
	/** Entrance finished — loading overlay gone, game uses normal layout. */
	liftComplete: false,
	/** Batch 4 finished after entrance. */
	postLiftAssetsReady: false,
	/** Overlay card spines warmed into the buy-bonus WebGL — safe to open the menu. */
	buyBonusWarmReady: false,
	/**
	 * True after a successful warm or open.
	 * Distinguishes first-entry (GameAssetsLoader) from post-feature remount.
	 */
	buyBonusEverWarmed: false,
	/** Buy-bonus board+cards painted — shell stays hidden until this so the menu appears whole. */
	buyBonusPanelReady: false,
	/** HUD tap arrived before the menu could be shown. Open once the cards are ready. */
	buyBonusOpenPending: false,
	/**
	 * Set during bought-feature eviction; cleared when basegame settles so warm-park can remount.
	 * Must live here (reactive) — a plain module `let` does not re-run shell `keepBuyWarm`.
	 */
	buyBonusFeatureEvictLock: false,
});
