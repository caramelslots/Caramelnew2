export const stateConfig = $state({
	jurisdiction: {
		socialCasino: false,
		disabledFullscreen: false,
		disabledTurbo: false,
		disabledSuperTurbo: false,
		disabledAutoplay: false,
		disabledSlamstop: false,
		disabledSpacebar: false,
		disabledBuyFeature: false,
		displayNetPosition: false,
		displayRTP: false,
		displaySessionTimer: false,
		minimumRoundDuration: 0,
	},
	/** Human-unit bet ladder from authenticate `betLevels` (÷ API_AMOUNT_MULTIPLIER). */
	betAmountOptions: [1, 5, 25, 50, 75, 100, 200, 500, 800, 1000],
	/** Full bet ladder for bet menu (same source as betAmountOptions after auth). */
	betMenuOptions: [1, 5, 25, 50, 75, 100, 200, 500, 800, 1000],
	/** Human-unit bounds / step / default from authenticate (0 = unset until auth). */
	minBet: 0,
	maxBet: 0,
	stepBet: 0,
	defaultBetLevel: 0,
});
