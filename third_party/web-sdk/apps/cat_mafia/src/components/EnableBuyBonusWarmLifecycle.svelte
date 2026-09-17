<!--
	Buy-bonus overlay WebGL:
	- Phone first session: no warm on Continue — first Buy press loads via prepareBuyBonusMenu.
	- Desktop first warm: GameAssetsLoader after batch 4.
	- Feature (Normal / Super / Duel): evict + this effect releases while not base.
	- Return to base: remount after the cloud finishes + delay (not mid-outro).
	- A Buy Bonus press never waits for that delay — prepareBuyBonusMenu loads now.
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
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { stateGame } from '../game/stateGame.svelte';

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
				if (areBuyBonusSpinesReady()) gameEntrance.buyBonusEverWarmed = true;
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

		// First session warm is sequenced vs batch 4 in GameAssetsLoader.
		if (!gameEntrance.buyBonusEverWarmed) return;

		scheduleRemount();
	});
</script>
