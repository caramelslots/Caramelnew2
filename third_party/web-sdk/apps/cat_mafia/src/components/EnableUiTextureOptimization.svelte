<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { optimizeUiButtonTextures } from '../game/optimizeUiTextures';

	const context = getContextApp();
	let optimized = false;

	$effect(() => {
		if (optimized || !context.stateApp.loaded) return;
		optimizeUiButtonTextures(context.stateApp.loadedAssets);
		optimized = true;
	});
</script>
