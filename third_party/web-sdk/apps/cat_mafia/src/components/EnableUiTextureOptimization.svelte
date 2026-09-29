<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { optimizeUiButtonTextures } from '../game/optimizeUiTextures';
	import { releaseCpuTextureTwins } from '../game/releaseCpuTextureTwins';

	const context = getContextApp();
	let optimized = false;

	$effect(() => {
		if (optimized || !context.stateApp.loaded) return;
		optimizeUiButtonTextures(context.stateApp.loadedAssets);
		releaseCpuTextureTwins(context.stateApp.pixiApplication ?? null);
		optimized = true;
	});
</script>
