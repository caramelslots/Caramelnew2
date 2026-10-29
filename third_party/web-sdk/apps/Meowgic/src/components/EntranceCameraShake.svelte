<script lang="ts">
	import { onDestroy } from 'svelte';

	import { getContextApp } from 'pixi-svelte';

	import { entranceReveal } from '../game/entranceReveal.svelte';

	const app = getContextApp();

	const stage = () => app.stateApp.pixiApplication?.stage;

	// Zooms the whole WebGL scene (room + board + mascot) around the screen center
	// without resizing the canvas element. Scale > 1 only, so the edges never show.
	$effect(() => {
		const pixi = app.stateApp.pixiApplication;
		const root = stage();
		if (!pixi || !root) return;
		const s = entranceReveal.cameraScale;
		const { width, height } = pixi.screen;
		root.scale.set(s);
		root.position.set((width / 2) * (1 - s), (height / 2) * (1 - s));
	});

	onDestroy(() => {
		const root = stage();
		root?.scale.set(1);
		root?.position.set(0, 0);
	});
</script>
