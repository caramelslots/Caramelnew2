<!--
	HTTP-warm buy-bonus assets as soon as content shows (don't wait for lift end).
	Card WebGL mounts via BuyBonusModalShell warm-park — SpinePlayer inside each card.

	After a bought feature, `evictBuyBonusForFeature` sets a reactive lock on gameEntrance.
	Once basegame settles, clear it so `keepBuyWarm` remounts the parked panel *before*
	the next tap (a plain module `let` never retriggered the shell).
-->
<script lang="ts">
	import { startBuyBonusFlowPreload } from '../game/uiHtmlAssetManifest';
	import {
		buyBonusWarmAfterFeatureMs,
		clearBuyBonusFeatureEvictLock,
		shouldKeepBuyBonusWarm,
	} from '../game/buyBonusSharedPixi';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { stateGame } from '../game/stateGame.svelte';

	const isTirLive = () =>
		stateGame.targetPickOpen ||
		stateGame.targetPickSlide > 0.001 ||
		stateGame.drumShootActive;

	const isSettledBasegame = () =>
		stateGame.gameType === 'basegame' &&
		!stateGame.freeSpinIntroActive &&
		!stateGame.transitionActive &&
		!stateDuel.active &&
		!isTirLive();

	$effect(() => {
		void stateGame.gameType;
		void stateGame.freeSpinIntroActive;
		void stateGame.transitionActive;
		void stateGame.targetPickOpen;
		void stateGame.targetPickSlide;
		void stateGame.drumShootActive;
		void stateDuel.active;
		void gameEntrance.showContent;
		void gameEntrance.liftComplete;
		void gameEntrance.buyBonusFeatureEvictLock;

		if (!gameEntrance.showContent) return;

		// Post-feature: lock blocks keepBuyWarm — HTTP can warm under lock; clear soon so park remounts.
		if (gameEntrance.buyBonusFeatureEvictLock) {
			if (!isSettledBasegame()) return;
			void startBuyBonusFlowPreload();
			const timer = setTimeout(() => {
				clearBuyBonusFeatureEvictLock();
				void startBuyBonusFlowPreload();
			}, buyBonusWarmAfterFeatureMs());
			return () => clearTimeout(timer);
		}

		if (!shouldKeepBuyBonusWarm()) return;
		void startBuyBonusFlowPreload();
	});
</script>
