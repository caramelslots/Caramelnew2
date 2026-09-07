<!--
	Static street under bootstrap / cards.
	Same plate box as Pixi, zoomed out via BG_HTML_STILL_FOV_SCALE (HTML only).
-->
<script lang="ts">
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { LOADER_STATIC_DAY_URL } from '../game/earlyLoaderPreload';
	import { getBackgroundHtmlStillStyle } from '../game/neonBackgroundLayout';

	const STREET_FADE_MS = 700;

	const context = getContext();

	let imgReady = $state(false);
	let imgEl = $state<HTMLImageElement | undefined>();

	const show = $derived(
		context.stateLayout.showLoadingScreen && !gameEntrance.hideLoaderStreet,
	);

	const streetStyle = $derived.by(() => {
		const layout = context.stateLayoutDerived.canvasSizes();
		const canvas =
			layout.width > 0 && layout.height > 0
				? layout
				: { width: window.innerWidth, height: window.innerHeight };
		return getBackgroundHtmlStillStyle(canvas);
	});

	$effect(() => {
		const img = imgEl;
		if (img?.complete && img.naturalWidth > 0) imgReady = true;
	});
</script>

{#if show}
	<div class="street-layer" style:--street-fade-ms="{STREET_FADE_MS}ms">
		<img
			class="street"
			class:ready={imgReady}
			bind:this={imgEl}
			src={LOADER_STATIC_DAY_URL}
			alt=""
			draggable="false"
			style={streetStyle}
			onload={() => (imgReady = true)}
		/>
	</div>
{/if}

<style lang="scss">
	.street-layer {
		/* Match Pixi resizeTo:window — same viewport origin as the canvas. */
		position: fixed;
		inset: 0;
		/* Under BootstrapLoader (999) and cards (44); above default Pixi stage. */
		z-index: 42;
		pointer-events: none;
		overflow: hidden;
		background: #000;
	}

	.street {
		position: absolute;
		/* Non-uniform stretch — same as Pixi plate box (before still-match nudge on Pixi). */
		object-fit: fill;
		opacity: 0;
		transition: opacity var(--street-fade-ms, 700ms) ease;
		pointer-events: none;
		user-select: none;
	}

	.street.ready {
		opacity: 1;
	}
</style>
