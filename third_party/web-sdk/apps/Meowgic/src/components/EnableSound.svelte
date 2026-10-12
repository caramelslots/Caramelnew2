<script lang="ts">
	import { onMount } from 'svelte';

	import type { LoadedAudio } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { sound, type SoundName } from '../game/sound';

	const context = getContext();

	onMount(() => {
		const loadedAssets = $state.snapshot(context.stateApp.loadedAssets);
		const packs = [
			loadedAssets['musicMain'],
			loadedAssets['musicBonus'],
			loadedAssets['sound'],
		] as LoadedAudio<SoundName>[];
		const { destroy } = sound.load(packs);

		return () => {
			// Equivalent to onDestroy(); Leave this comment for searching.
			destroy();
		};
	});

	sound.enableEffect();
	sound.volumeEffect();
</script>
