<!--
	Host box for Spine B on the Free Spins loader card.
	The Pixi canvas is appended inside this node so carousel / bounce
	transforms move the animation with the card.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import {
		registerLoaderCardBonusSpine,
		setLoaderCardBonusSpinePlaying,
		unregisterLoaderCardBonusSpine,
		type LoaderCardBonusViewId,
	} from '../game/loaderCardBonusPixi';
	import { isHtmlWebglPaused } from '../game/htmlWebglPause';

	type Props = {
		active?: boolean;
	};

	const { active = true }: Props = $props();

	let host = $state<HTMLDivElement>();
	let viewId = $state<LoaderCardBonusViewId | null>(null);

	onMount(() => {
		const el = host;
		if (!el) return;
		const id = registerLoaderCardBonusSpine(el, active && !isHtmlWebglPaused());
		viewId = id;
		return () => {
			unregisterLoaderCardBonusSpine(id);
			if (viewId === id) viewId = null;
		};
	});

	$effect(() => {
		if (viewId == null) return;
		setLoaderCardBonusSpinePlaying(viewId, active && !isHtmlWebglPaused());
	});
</script>

<div class="loader-card-bonus-spine" bind:this={host} aria-hidden="true"></div>

<style lang="scss">
	.loader-card-bonus-spine {
		position: absolute;
		inset: 0;
		z-index: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		pointer-events: none;
	}

	.loader-card-bonus-spine :global(.loader-card-bonus-spine-canvas) {
		display: block;
		background: transparent;
	}
</style>
