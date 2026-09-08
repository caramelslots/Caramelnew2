<!--
	Buy-bonus HTML overlay covers the slot. Stop the main Pixi ticker so the
	game WebGL context does not keep rendering at 60 fps underneath.
-->
<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { isBuyBonusFlowOpen } from '../game/isAnyMenuOpen';

	const pixiContext = getContextApp();

	$effect(() => {
		const pause = isBuyBonusFlowOpen();
		const app = pixiContext.stateApp.pixiApplication;
		if (!app?.ticker) return;

		if (pause) {
			if (app.ticker.started) app.ticker.stop();
			return;
		}
		if (!app.ticker.started) app.ticker.start();
	});
</script>
