<!--
	Shared blur backdrop for buy-bonus menu + confirm.
	Shell JS loads after the bootstrap loader. Card WebGL is created only while
	a panel is visible and released when the flow closes.
-->
<script lang="ts">
	import { stateModal } from 'state-shared';

	import BuyBonusOverlay from './BuyBonusOverlay.svelte';
	import BuyBonusConfirmOverlay from './BuyBonusConfirmOverlay.svelte';
	import BuyDuelPickOverlay from './BuyDuelPickOverlay.svelte';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { startBuyBonusFlowPreload } from '../game/uiHtmlAssetManifest';
	import { isPhoneForAtlasDownscale } from '../game/phoneSpineAtlasDownscale';

	const shellMounted = $derived(gameEntrance.showContent);
	const showBuyPanel = $derived(stateModal.modal?.name === 'buyBonus');
	const showConfirmPanel = $derived(stateModal.modal?.name === 'buyBonusConfirm');
	const showDuelPickPanel = $derived(stateModal.modal?.name === 'buyDuelPick');
	/** Blur shell only when buy panel is painted — avoid empty-card flash. */
	const isVisible = $derived(
		(showBuyPanel && gameEntrance.buyBonusPanelReady) || showConfirmPanel || showDuelPickPanel,
	);
	/** Keep shell in DOM for layout while spines flush (no blur yet). */
	const isPreparingBuy = $derived(showBuyPanel && !gameEntrance.buyBonusPanelReady);
	const isBuyFlowOpen = $derived(showBuyPanel || showConfirmPanel || showDuelPickPanel);
	const phoneDim = isPhoneForAtlasDownscale();

	$effect(() => {
		if (isBuyFlowOpen) startBuyBonusFlowPreload();
	});
</script>

{#if shellMounted}
	<div
		class="buy-bonus-modal-shell"
		class:active={isVisible}
		class:preparing={isPreparingBuy}
		class:phone-dim={phoneDim}
		aria-hidden={!isVisible}
		inert={!isVisible && !isPreparingBuy}
		data-test="buy-bonus-modal-shell"
	>
		<div
			class="panel-slot"
			class:active={showBuyPanel && gameEntrance.buyBonusPanelReady}
			class:preparing={isPreparingBuy}
			aria-hidden={!showBuyPanel}
			inert={!showBuyPanel || !gameEntrance.buyBonusPanelReady}
		>
			<BuyBonusOverlay />
		</div>
		<div
			class="panel-slot"
			class:active={showConfirmPanel}
			aria-hidden={!showConfirmPanel}
			inert={!showConfirmPanel}
		>
			<BuyBonusConfirmOverlay />
		</div>
		<div
			class="panel-slot"
			class:active={showDuelPickPanel}
			class:preparing={isBuyFlowOpen && !showDuelPickPanel}
			aria-hidden={!showDuelPickPanel}
			inert={!showDuelPickPanel}
		>
			<BuyDuelPickOverlay />
		</div>
	</div>
{/if}

<style lang="scss">
	.buy-bonus-modal-shell {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: transparent;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;

		&.active {
			opacity: 1;
			visibility: visible;
			pointer-events: auto;
			background: rgba(0, 0, 0, 0.5);
			backdrop-filter: blur(30px);
			-webkit-backdrop-filter: blur(30px);
		}

		/* iOS: blur + two WebGL contexts Jetsams on open. 50% dim, no holes. */
		&.active.phone-dim {
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
			background: rgba(0, 0, 0, 0.5);
		}

		/* Instant feedback on tap: dim while spines flush, then reveal cards. */
		&.preparing:not(.active) {
			opacity: 1;
			visibility: visible;
			pointer-events: auto;
			background: rgba(0, 0, 0, 0.5);
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
		}

		&:not(.active):not(.preparing),
		&:not(.active):not(.preparing) * {
			pointer-events: none !important;
		}
	}

	.panel-slot {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.2vh 2vw;
		box-sizing: border-box;
		container-type: size;
		container-name: buy-bonus-slot;
		opacity: 0;
		pointer-events: none;
		z-index: 0;

		&.active {
			opacity: 1;
			pointer-events: auto;
			z-index: 1;
		}

		/* Layout hosts off-screen while spines flush — keep size, hide paint. */
		&.preparing {
			opacity: 0;
			pointer-events: none;
			z-index: 0;
			visibility: visible;
		}

		&:not(.active):not(.preparing),
		&:not(.active):not(.preparing) * {
			pointer-events: none !important;
		}
	}
</style>
