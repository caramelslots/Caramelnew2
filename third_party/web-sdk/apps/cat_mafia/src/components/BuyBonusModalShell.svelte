<!--
	Shared blur backdrop for buy-bonus menu + confirm.
	Shell stays mounted after game enter (hidden) so backdrop + PNGs are warm
	before the first open; only visibility toggles on show/hide and panel swap.
-->
<script lang="ts">
	import { stateModal } from 'state-shared';

	import BuyBonusOverlay from './BuyBonusOverlay.svelte';
	import BuyBonusConfirmOverlay from './BuyBonusConfirmOverlay.svelte';
	import BuyDuelPickOverlay from './BuyDuelPickOverlay.svelte';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { startBuyBonusFlowPreload } from '../game/uiHtmlAssetManifest';

	const shellMounted = $derived(gameEntrance.showContent);
	const isVisible = $derived(
		stateModal.modal?.name === 'buyBonus' ||
			stateModal.modal?.name === 'buyBonusConfirm' ||
			stateModal.modal?.name === 'buyDuelPick',
	);
	const showBuyPanel = $derived(stateModal.modal?.name === 'buyBonus');
	const showConfirmPanel = $derived(stateModal.modal?.name === 'buyBonusConfirm');
	const showDuelPickPanel = $derived(stateModal.modal?.name === 'buyDuelPick');

	$effect(() => {
		if (shellMounted) startBuyBonusFlowPreload();
	});
</script>

{#if shellMounted}
	<div
		class="buy-bonus-modal-shell"
		class:active={isVisible}
		aria-hidden={!isVisible}
		data-test="buy-bonus-modal-shell"
	>
		<div class="panel-slot" class:active={showBuyPanel} aria-hidden={!showBuyPanel}>
			<BuyBonusOverlay />
		</div>
		<div class="panel-slot" class:active={showConfirmPanel} aria-hidden={!showConfirmPanel}>
			<BuyBonusConfirmOverlay />
		</div>
		<div class="panel-slot" class:active={showDuelPickPanel} aria-hidden={!showDuelPickPanel}>
			<BuyDuelPickOverlay />
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
		visibility: hidden;
		pointer-events: none;
		will-change: backdrop-filter;

		&.active {
			visibility: visible;
			pointer-events: auto;
		}
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
