<!--
	Buy-bonus HTML/Spine preload runs on menu open (shell / HUD tap), not on base entry.
	After a bought feature, `evictBuyBonusForFeature` sets a reactive lock on gameEntrance.
	Once basegame settles, clear it and re-warm HTTP so the next tap feels instant.
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
		if (!gameEntrance.buyBonusFeatureEvictLock) return;
		if (!isSettledBasegame()) return;

		void startBuyBonusFlowPreload();
		const timer = setTimeout(() => {
			clearBuyBonusFeatureEvictLock();
			void startBuyBonusFlowPreload();
		}, buyBonusWarmAfterFeatureMs());
		return () => clearTimeout(timer);
	});
</script>
