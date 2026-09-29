<!--
	HTTP-warm buy-bonus assets as soon as content shows (don't wait for lift end).
	Overlay WebGL + atlases load on first menu open only (no base warm-park).

	After a bought feature, `evictBuyBonusForFeature` sets a reactive lock on gameEntrance.
	Once basegame settles, clear it so the next tap can open Buy Bonus again.
-->
<script lang="ts">
	import { startBuyBonusFlowPreload } from '../game/uiHtmlAssetManifest';
	import {
		buyBonusWarmAfterFeatureMs,
		clearBuyBonusFeatureEvictLock,
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

		// Post-feature: lock blocks open — HTTP can warm under lock; clear soon.
		if (gameEntrance.buyBonusFeatureEvictLock) {
			if (!isSettledBasegame()) return;
			void startBuyBonusFlowPreload();
			const timer = setTimeout(() => {
				clearBuyBonusFeatureEvictLock();
				void startBuyBonusFlowPreload();
			}, buyBonusWarmAfterFeatureMs());
			return () => clearTimeout(timer);
		}

		void startBuyBonusFlowPreload();
	});
</script>
