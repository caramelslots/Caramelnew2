<!--
	After the entrance lift, HTTP-preload and upload buy-bonus card atlases into the
	parked overlay GL so the first menu open only resizes. After a bought feature,
	`evictBuyBonusForFeature` locks warm until basegame settles, then this runs again.
-->
<script lang="ts">
	import { startBuyBonusFlowPreload, startAutoplayPanelPreload, startSettingsPanelPreload } from '../game/uiHtmlAssetManifest';
	import {
		buyBonusWarmAfterFeatureMs,
		buyBonusOpenDelayMs,
		clearBuyBonusFeatureEvictLock,
		commitPendingBuyBonusMenuOpen,
		noteBuyBonusIntroCleared,
		startBuyBonusGpuWarm,
	} from '../game/buyBonusSharedPixi';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import { stateXstateDerived } from '../game/stateXstate';

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

	/** Card WebGL after the lift — first Buy Bonus open must not wait on atlas upload. */
	$effect(() => {
		void gameEntrance.showContent;
		void gameEntrance.liftComplete;
		void gameEntrance.buyBonusFeatureEvictLock;
		void stateGame.gameType;
		void stateGame.freeSpinIntroActive;
		void stateGame.transitionActive;
		void stateGame.targetPickOpen;
		void stateGame.targetPickSlide;
		void stateGame.drumShootActive;
		void stateDuel.active;

		if (!gameEntrance.showContent || !gameEntrance.liftComplete) return;
		if (gameEntrance.buyBonusFeatureEvictLock) return;
		if (!isSettledBasegame()) return;

		const timer = setTimeout(() => {
			void startBuyBonusFlowPreload();
			void startBuyBonusGpuWarm();
			void startSettingsPanelPreload();
			void startAutoplayPanelPreload();
		}, 400);
		return () => clearTimeout(timer);
	});

	/** Intro panel has left — start the extra pause before a pending Buy Bonus may show. */
	$effect(() => {
		if (!gameEntrance.liftComplete) return;
		noteBuyBonusIntroCleared();
	});

	/** A fast Buy tap waits until the intro is gone and the cards can be shown in one frame. */
	$effect(() => {
		if (!gameEntrance.buyBonusOpenPending) return;
		void gameEntrance.liftComplete;
		void gameEntrance.buyBonusWarmReady;
		void gameEntrance.buyBonusFeatureEvictLock;
		void stateXstateDerived.isIdle();

		const delay = buyBonusOpenDelayMs();
		if (delay === null) return;

		let cancelled = false;
		const timer = setTimeout(() => {
			void Promise.all([startBuyBonusFlowPreload(), startBuyBonusGpuWarm()]).then(() => {
				if (cancelled) return;
				commitPendingBuyBonusMenuOpen();
			});
		}, delay);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});
</script>
