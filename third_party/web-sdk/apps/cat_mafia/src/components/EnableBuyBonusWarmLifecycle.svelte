<!--
	Buy-bonus overlay WebGL: warm in basegame (incl. before first open),
	cold-destroy in FS. See buyBonusSharedPixi ensureBuyBonusWarm / release.
-->
<script lang="ts">
	import {
		ensureBuyBonusWarm,
		releaseBuyBonusSharedStage,
		shouldKeepBuyBonusWarm,
	} from '../game/buyBonusSharedPixi';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateGame } from '../game/stateGame.svelte';

	$effect(() => {
		void stateGame.gameType;
		void stateGame.freeSpinIntroActive;
		void gameEntrance.showContent;

		if (!shouldKeepBuyBonusWarm()) {
			releaseBuyBonusSharedStage();
			return;
		}
		if (!gameEntrance.showContent) return;

		let cancelled = false;
		// Yield past entrance paint so warm does not contend with HUD fade-in.
		const timer = window.setTimeout(() => {
			if (cancelled || !shouldKeepBuyBonusWarm()) return;
			void ensureBuyBonusWarm();
		}, 0);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});
</script>
