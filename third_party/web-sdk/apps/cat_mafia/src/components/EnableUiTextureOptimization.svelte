<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { optimizeUiButtonTextures } from '../game/optimizeUiTextures';
	import { releaseCpuTextureTwins } from '../game/releaseCpuTextureTwins';

	const context = getContextApp();
	let optimized = false;

	$effect(() => {
		// Wait until the slot is visible — releasing twins at `loaded` (still under
		// the loader) can blank board/bg atlases that never got a GPU upload.
		if (optimized || !context.stateApp.loaded || !gameEntrance.liftComplete) return;
		optimizeUiButtonTextures(context.stateApp.loadedAssets);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				releaseCpuTextureTwins(context.stateApp.pixiApplication ?? null);
			});
		});
		optimized = true;
	});
</script>
