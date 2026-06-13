<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { optimizeSymbolTextures } from '../game/optimizeSymbolTextures';

	const context = getContextApp();
	let optimized = false;

	$effect(() => {
		if (optimized || !context.stateApp.loaded) return;
		optimizeSymbolTextures(context.stateApp.loadedAssets);
		optimized = true;
	});
</script>
