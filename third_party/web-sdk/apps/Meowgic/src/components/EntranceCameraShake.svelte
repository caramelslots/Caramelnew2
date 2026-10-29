<script lang="ts">
	import { onDestroy } from 'svelte';

	import { getContextApp } from 'pixi-svelte';

	import { entranceReveal } from '../game/entranceReveal.svelte';

	const app = getContextApp();

	const stage = () => app.stateApp.pixiApplication?.stage;

	// Moves the whole WebGL scene (room + board) without shifting the canvas element,
	// so the cover plate hides the edges of a few-pixel jolt.
	$effect(() => {
		const root = stage();
		if (!root) return;
		root.position.set(entranceReveal.shakeX, entranceReveal.shakeY);
	});

	onDestroy(() => {
		stage()?.position.set(0, 0);
	});
</script>
