<!--
	Shared blur backdrop for buy-bonus menu + confirm.
	Both panels stay mounted while open; only visibility toggles to avoid blink.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { stateModal } from 'state-shared';

	import BuyBonusOverlay from './BuyBonusOverlay.svelte';
	import BuyBonusConfirmOverlay from './BuyBonusConfirmOverlay.svelte';
	import { BUY_BONUS_ASSETS } from '../game/uiHtmlAssetManifest';
	import { preloadHtmlImages } from '../game/preloadHtmlImages';

	const isOpen = $derived(
		stateModal.modal?.name === 'buyBonus' || stateModal.modal?.name === 'buyBonusConfirm',
	);
	const showBuyPanel = $derived(stateModal.modal?.name === 'buyBonus');
	const showConfirmPanel = $derived(stateModal.modal?.name === 'buyBonusConfirm');

	onMount(() => {
		void preloadHtmlImages(
			[
				BUY_BONUS_ASSETS.menuBg,
				BUY_BONUS_ASSETS.confirmBg,
				BUY_BONUS_ASSETS.normalCard,
				BUY_BONUS_ASSETS.superCard,
				BUY_BONUS_ASSETS.cancelButtonBg,
				BUY_BONUS_ASSETS.confirmButtonBg,
			],
			{ priority: [BUY_BONUS_ASSETS.confirmBg], concurrency: 3 },
		);
	});
</script>

{#if isOpen}
	<div class="buy-bonus-modal-shell" data-test="buy-bonus-modal-shell">
		<div class="panel-slot" class:active={showBuyPanel} aria-hidden={!showBuyPanel}>
			<BuyBonusOverlay />
		</div>
		<div class="panel-slot" class:active={showConfirmPanel} aria-hidden={!showConfirmPanel}>
			<BuyBonusConfirmOverlay />
		</div>
	</div>
{/if}

<style lang="scss">
	.buy-bonus-modal-shell {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
		pointer-events: auto;
	}

	.panel-slot {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		box-sizing: border-box;
		visibility: hidden;
		pointer-events: none;

		&.active {
			visibility: visible;
			pointer-events: auto;
		}
	}
</style>
