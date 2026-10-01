<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { optimizeUiButtonTextures } from '../game/optimizeUiTextures';

	const context = getContextApp();
	let optimized = false;

	$effect(() => {
		if (optimized || !context.stateApp.loaded || !gameEntrance.liftComplete) return;
		optimizeUiButtonTextures(context.stateApp.loadedAssets);
		// Do not releaseCpuTextureTwins on the main app — spin WebPs go blank
		// after texture GC tries to re-upload with a nulled resource.
		optimized = true;
	});
</script>
