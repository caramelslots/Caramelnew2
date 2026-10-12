<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	import { downscalePhoneSpineAtlases } from '../game/phoneSpineAtlasDownscale';

	const context = getContextApp();
	let done = false;

	$effect(() => {
		if (done || !context.stateApp.loaded) return;
		done = true;
		const result = downscalePhoneSpineAtlases();
		if (result.pages > 0) {
			console.info(
				`[phoneSpineAtlas] downscaled ${result.pages} page(s) across ${result.atlases} atlas(es)`,
			);
		}
	});
</script>
