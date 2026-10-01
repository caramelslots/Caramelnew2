<!--
	Buy-bonus card host — layout anchor for shared Pixi card spines
	(`buyBonusSharedPixi`). No HTML SpinePlayer / extra WebGL context.

	Confirm registers its own host; menu hosts stay mounted with active=false.
-->
<script lang="ts">
	import {
		areBuyBonusSpinesReady,
		ensureBuyBonusWarm,
		flushBuyBonusSharedStage,
		registerBuyBonusCardView,
		setBuyBonusCardViewActive,
		unregisterBuyBonusCardView,
		type BuyBonusCardViewId,
	} from '../game/buyBonusSharedPixi';
	import { setBuyBonusCardReady } from '../game/buyBonusCardGpu';
	import { registerBuyBonusCardSpineHost } from '../game/buyBonusCardHosts';
	import type { BuyBonusSpineVariant } from '../game/buyBonusHtmlSpine';
	import { gameEntrance } from '../game/gameEntrance.svelte';

	type Props = {
		variant: BuyBonusSpineVariant;
		/** Menu/confirm visible for this card — drives idle tick in shared stage. */
		active?: boolean;
	};

	const { variant, active = true }: Props = $props();

	let hostEl = $state<HTMLDivElement | undefined>();
	let viewId = $state<BuyBonusCardViewId | null>(null);
	let ready = $state(false);
	/** Ref-count API is incremental — only notify on edge changes. */
	let reportedReady = false;

	const syncReadyFlag = (next: boolean) => {
		ready = next;
		if (reportedReady === next) return;
		reportedReady = next;
		setBuyBonusCardReady(variant, next);
	};

	$effect(() => {
		const el = hostEl;
		if (!el) return;

		registerBuyBonusCardSpineHost(variant, el);
		const id = registerBuyBonusCardView(variant, el, active);
		viewId = id;
		void ensureBuyBonusWarm().then(() => {
			syncReadyFlag(areBuyBonusSpinesReady([variant]));
			if (active) flushBuyBonusSharedStage();
		});

		return () => {
			unregisterBuyBonusCardView(id);
			if (viewId === id) viewId = null;
			registerBuyBonusCardSpineHost(variant, null);
			syncReadyFlag(false);
		};
	});

	$effect(() => {
		const id = viewId;
		if (id == null) return;
		setBuyBonusCardViewActive(id, active);
		if (active) {
			// Layout may have been skipped while the panel slot was opacity:0.
			requestAnimationFrame(() => flushBuyBonusSharedStage());
		}
	});

	$effect(() => {
		void gameEntrance.buyBonusWarmReady;
		syncReadyFlag(areBuyBonusSpinesReady([variant]));
	});
</script>

<div
	class="buy-bonus-card-spine"
	class:ready
	bind:this={hostEl}
	aria-hidden="true"
	data-buy-bonus-card-host={variant}
></div>

<style lang="scss">
	.buy-bonus-card-spine {
		position: absolute;
		inset: 0;
		z-index: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		overflow: hidden;
	}
</style>
