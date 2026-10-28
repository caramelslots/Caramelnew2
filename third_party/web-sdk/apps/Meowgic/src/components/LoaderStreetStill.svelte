<!--
	Baked day street (day.webp) behind bootstrap + cards.
	Preloaded in app.html / earlyLoaderPreload so it paints before Pixi spines.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { LOADER_STATIC_DAY_URL } from '../game/earlyLoaderPreload';
	import { getBackgroundHtmlStillStyle } from '../game/neonBackgroundLayout';

	const context = getContext();

	let ready = $state(false);

	const canvasSize = $derived.by(() => {
		const layout = context.stateLayoutDerived.canvasSizes();
		return layout.width > 0 && layout.height > 0
			? layout
			: { width: window.innerWidth, height: window.innerHeight };
	});

	const plateStyle = $derived(getBackgroundHtmlStillStyle(canvasSize));

	/** Cover until Continue — then Pixi street + steam take over. */
	const show = $derived(
		context.stateLayout.showLoadingScreen &&
			!gameEntrance.loaderExitActive &&
			!gameEntrance.showContent,
	);

	onMount(() => {
		const img = new Image();
		img.decoding = 'async';
		img.onload = () => {
			ready = true;
		};
		img.onerror = () => {
			ready = true;
		};
		img.src = LOADER_STATIC_DAY_URL;
		if (img.complete) ready = true;
	});
</script>

{#if show}
	<div class="street-still" class:ready aria-hidden="true">
		<img
			class="street-still__img"
			src={LOADER_STATIC_DAY_URL}
			alt=""
			draggable="false"
			style={plateStyle}
		/>
	</div>
{/if}

<style lang="scss">
	.street-still {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
		background: #000;
	}

	.street-still__img {
		position: absolute;
		display: block;
		object-fit: fill;
		opacity: 0;
		transition: opacity 280ms ease;
		pointer-events: none;
		user-select: none;
	}

	.street-still.ready .street-still__img {
		opacity: 1;
	}
</style>
