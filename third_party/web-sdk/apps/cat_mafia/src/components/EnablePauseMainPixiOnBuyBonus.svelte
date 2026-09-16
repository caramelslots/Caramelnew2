<!--
	Buy-bonus HTML covers the slot. Stop the main Pixi ticker so that
	WebGL is not rendered under the menu (iOS GPU).

	Do not pause for FS intro / extra — the mascot is Pixi and must keep idle.
	Stopping the ticker does not free VRAM and does not prevent Jetsam.
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
