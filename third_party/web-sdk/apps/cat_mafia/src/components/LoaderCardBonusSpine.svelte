<!--
	Host box for loader card 1 Bonus symbol.
	Shared Pixi WebGL context (loaderCardBonusPixi).
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { isHtmlWebglPaused } from '../game/htmlWebglPause';
	import {
		registerLoaderCardBonusView,
		setLoaderCardBonusViewActive,
		unregisterLoaderCardBonusView,
		type LoaderCardBonusViewId,
	} from '../game/loaderCardBonusPixi';

	type Props = {
		active?: boolean;
	};

	const { active = true }: Props = $props();

	let host = $state<HTMLDivElement>();
	let viewId = $state<LoaderCardBonusViewId | null>(null);

	onMount(() => {
		const el = host;
		if (!el) return;
		const id = registerLoaderCardBonusView(el, active && !isHtmlWebglPaused());
		viewId = id;
		return () => {
			unregisterLoaderCardBonusView(id);
			if (viewId === id) viewId = null;
		};
	});

	$effect(() => {
		if (viewId == null) return;
		setLoaderCardBonusViewActive(viewId, active && !isHtmlWebglPaused());
	});
</script>

<div class="loader-card-bonus-spine" bind:this={host} aria-hidden="true"></div>

<style lang="scss">
	.loader-card-bonus-spine {
		position: absolute;
		inset: 0;
		z-index: 1;
		width: 100%;
		height: 100%;
		overflow: hidden;
		pointer-events: none;

		:global(.loader-card-bonus-pixi-canvas) {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
		}
	}
</style>
