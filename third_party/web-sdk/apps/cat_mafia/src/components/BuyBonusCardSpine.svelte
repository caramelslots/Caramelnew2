<!--
	Host box for a buy-bonus card Spine.
	All cards share one WebGL context (buyBonusSharedPixi).
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import {
		registerBuyBonusCardView,
		setBuyBonusCardViewActive,
		unregisterBuyBonusCardView,
		type BuyBonusCardViewId,
	} from '../game/buyBonusSharedPixi';
	import type { BuyBonusSpineVariant } from '../game/buyBonusHtmlSpine';
	import { isHtmlWebglPaused } from '../game/htmlWebglPause';

	type Props = {
		variant: BuyBonusSpineVariant;
		active?: boolean;
	};

	const { variant, active = true }: Props = $props();

	let host = $state<HTMLDivElement>();
	let viewId = $state<BuyBonusCardViewId | null>(null);

	onMount(() => {
		const el = host;
		if (!el) return;
		const id = registerBuyBonusCardView(variant, el, active && !isHtmlWebglPaused());
		viewId = id;
		return () => {
			unregisterBuyBonusCardView(id);
			if (viewId === id) viewId = null;
		};
	});

	$effect(() => {
		if (viewId == null) return;
		setBuyBonusCardViewActive(viewId, active && !isHtmlWebglPaused());
	});
</script>

<div class="buy-bonus-card-spine" bind:this={host} aria-hidden="true"></div>

<style lang="scss">
	.buy-bonus-card-spine {
		position: absolute;
		inset: 0;
		z-index: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
</style>
