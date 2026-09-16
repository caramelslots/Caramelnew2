<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { optimizeSymbolTextures } from '../game/optimizeSymbolTextures';

	const context = getContextApp();
	let optimized = false;

	$effect(() => {
		if (optimized || !context.stateApp.loaded) return;
		// Only the small 196² spin WebPs — mipmaps on huge letter/phone spines
		// make fine gold filigree look smeared when drawn tiny in the cell.
		optimizeSymbolTextures(context.stateApp.loadedAssets);
		optimized = true;
	});
</script>
