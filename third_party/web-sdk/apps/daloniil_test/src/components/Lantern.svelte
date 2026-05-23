<script lang="ts">
	import { onMount } from 'svelte';
	import { Sprite } from 'pixi-svelte';

	type Props = {
		assetKey: 'lanternDay' | 'lanternNight';
		x: number;
		y: number;
		height: number;
		// Peak sway angle in radians.
		amplitude?: number;
		// Period of one full swing in milliseconds.
		period?: number;
		// Per-instance phase offset (radians) so multiple lanterns don't sway in unison.
		phase?: number;
	};

	const {
		assetKey,
		x,
		y,
		height,
		amplitude = 0.07,
		period = 3200,
		phase = 0,
	}: Props = $props();

	// Native artwork is ~330×966 (≈ 0.342 aspect). Width is derived from
	// the requested height so the caller controls the visual size.
	const ASPECT = 330 / 966;
	const width = $derived(height * ASPECT);

	let rotation = $state(0);
	let raf = 0;

	onMount(() => {
		const start = performance.now();
		const tick = (now: number) => {
			const t = (now - start) / period;
			rotation = amplitude * Math.sin(2 * Math.PI * t + phase);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

<Sprite
	key={assetKey}
	{x}
	{y}
	{width}
	{height}
	anchor={{ x: 0.5, y: 0 }}
	{rotation}
/>
