<!--
	Buy-bonus overlay WebGL:
	- First session: no warm on Continue — first Buy press loads via prepareBuyBonusMenu.
	- After a bought bonus / FS: evict while not base, remount when settled.
	- Character pick / confirm screens are not warmed here.
-->
<script lang="ts">
	import {
		areBuyBonusSpinesReady,
		buyBonusWarmAfterFeatureMs,
		clearBuyBonusFeatureEvictLock,
		ensureBuyBonusWarm,
		releaseBuyBonusSharedStage,
		shouldKeepBuyBonusWarm,
	} from '../game/buyBonusSharedPixi';
	import { suspendBuyBonusSpineBitmapDecode } from '../game/buyBonusHtmlSpine';
	import { isBuyBonusFlowOpen } from '../game/isAnyMenuOpen';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import { stateModal } from 'state-shared';

	let remountTimer: ReturnType<typeof setTimeout> | undefined;

	const cancelRemount = () => {
		if (remountTimer === undefined) return;
		clearTimeout(remountTimer);
		remountTimer = undefined;
	};

	const scheduleRemount = () => {
		if (remountTimer !== undefined) return;
		if (areBuyBonusSpinesReady()) return;
		remountTimer = setTimeout(() => {
			remountTimer = undefined;
			if (!shouldKeepBuyBonusWarm()) return;
			void ensureBuyBonusWarm().then(() => {
				if (areBuyBonusSpinesReady()) {
					gameEntrance.buyBonusEverWarmed = true;
				}
			});
		}, buyBonusWarmAfterFeatureMs());
	};

	$effect(() => {
		void stateGame.gameType;
		void stateGame.freeSpinIntroActive;
		void stateGame.transitionActive;
		void stateGame.targetPickOpen;
		void stateGame.targetPickSlide;
		void stateGame.drumShootActive;
		void stateDuel.active;
		void stateModal.modal;
		void gameEntrance.liftComplete;
		void gameEntrance.buyBonusWarmReady;
		void gameEntrance.buyBonusEverWarmed;

		const settledBase =
			stateGame.gameType === 'basegame' &&
			!stateDuel.active &&
			!stateGame.freeSpinIntroActive &&
			!stateGame.transitionActive &&
			!stateGame.targetPickOpen &&
			!(stateGame.targetPickSlide > 0.001) &&
			!stateGame.drumShootActive;

		if (settledBase) clearBuyBonusFeatureEvictLock();

		const menuOpen = isBuyBonusFlowOpen();

		if (menuOpen) {
			cancelRemount();
			if (!areBuyBonusSpinesReady()) void ensureBuyBonusWarm();
			return;
		}

		if (!shouldKeepBuyBonusWarm()) {
			cancelRemount();
			suspendBuyBonusSpineBitmapDecode();
			releaseBuyBonusSharedStage();
			return;
		}

		if (!gameEntrance.liftComplete) return;

		if (areBuyBonusSpinesReady() || gameEntrance.buyBonusWarmReady) {
			cancelRemount();
			return;
		}

		// Do not warm until the player has opened Buy Bonus at least once.
		if (!gameEntrance.buyBonusEverWarmed) return;

		scheduleRemount();
	});
</script>
