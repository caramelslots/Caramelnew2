<!--
	Shared blur backdrop for buy-bonus menu + confirm.
	Buy panel mounts only when the menu/confirm is open — no off-screen WebGL warm
	park on base (atlases + fb:buyBonus were ~30MB+ with CPU twins).
-->
<script lang="ts">
	import { stateModal } from 'state-shared';

	import BuyBonusOverlay from './BuyBonusOverlay.svelte';
	import BuyBonusConfirmOverlay from './BuyBonusConfirmOverlay.svelte';
	import BuyDuelPickOverlay from './BuyDuelPickOverlay.svelte';
	import { clearBuyBonusFeatureEvictLock } from '../game/buyBonusSharedPixi';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { startBuyBonusFlowPreload } from '../game/uiHtmlAssetManifest';
	import { releaseAllBuyBonusCardSpinePlayers } from '../game/buyBonusCardGpu';
	import { releaseAllDuelPickSpinePlayers } from '../game/duelPickGpu';

	const shellMounted = $derived(gameEntrance.showContent);
	const showBuyPanel = $derived(stateModal.modal?.name === 'buyBonus');
	const showConfirmPanel = $derived(stateModal.modal?.name === 'buyBonusConfirm');
	const showDuelPickPanel = $derived(stateModal.modal?.name === 'buyDuelPick');
	const isBuyFlowOpen = $derived(showBuyPanel || showConfirmPanel || showDuelPickPanel);

	/** Confirm reparents menu portal — keep buy overlay mounted while confirm is open. */
	const mountBuyPanel = $derived(showBuyPanel || showConfirmPanel);
	const mountConfirmPanel = $derived(showConfirmPanel);

	/** Dim while spines flush; reveal board + cards together when ready. */
	const isPreparingBuy = $derived(showBuyPanel && !gameEntrance.buyBonusPanelReady);
	const isVisible = $derived(
		(showBuyPanel && gameEntrance.buyBonusPanelReady) ||
			showConfirmPanel ||
			showDuelPickPanel,
	);

	/** Opening buy flow after a feature must drop the eviction lock or warm never returns. */
	$effect(() => {
		if (!isBuyFlowOpen) return;
		clearBuyBonusFeatureEvictLock();
	});

	$effect(() => {
		if (isBuyFlowOpen) {
			startBuyBonusFlowPreload();
			return;
		}
		releaseAllDuelPickSpinePlayers();
		releaseAllBuyBonusCardSpinePlayers();
	});
</script>

{#if shellMounted}
	<div
		class="buy-bonus-modal-shell"
		class:active={isVisible}
		class:preparing={isPreparingBuy}
		aria-hidden={!isVisible}
		inert={!isVisible && !isPreparingBuy}
		data-buy-bonus-prepare={isPreparingBuy ? '' : undefined}
		data-test="buy-bonus-modal-shell"
	>
		<div
			class="panel-slot"
			class:active={showBuyPanel && gameEntrance.buyBonusPanelReady}
			class:preparing={isPreparingBuy}
			aria-hidden={!showBuyPanel || !gameEntrance.buyBonusPanelReady}
			inert={!showBuyPanel || !gameEntrance.buyBonusPanelReady}
			data-buy-bonus-prepare={isPreparingBuy ? '' : undefined}
		>
			{#if mountBuyPanel}
				<BuyBonusOverlay />
			{/if}
		</div>
		<div
			class="panel-slot"
			class:active={showConfirmPanel}
			aria-hidden={!showConfirmPanel}
			inert={!showConfirmPanel}
		>
			{#if mountConfirmPanel}
				<BuyBonusConfirmOverlay />
			{/if}
		</div>
		<div
			class="panel-slot"
			class:active={showDuelPickPanel}
			class:preparing={isBuyFlowOpen && !showDuelPickPanel}
			aria-hidden={!showDuelPickPanel}
			inert={!showDuelPickPanel}
		>
			{#if isBuyFlowOpen}
				<BuyDuelPickOverlay />
			{/if}
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

		/* Tap feedback: dim only while spines flush — board stays hidden until ready. */
		&.preparing:not(.active) {
			opacity: 1;
			visibility: visible;
			pointer-events: auto;
			background: rgba(0, 0, 0, 0.5);
			backdrop-filter: blur(30px);
			-webkit-backdrop-filter: blur(30px);
		}

		/* Park card WebGL off-screen after lift — keep layout size, no paint. */
		&.warm:not(.active):not(.preparing) {
			opacity: 0;
			visibility: visible;
			pointer-events: none;
			background: transparent;
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
		}

		&:not(.active):not(.preparing):not(.warm),
		&:not(.active):not(.preparing):not(.warm) * {
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

		/* Layout hosts off-screen while spines flush — keep size, hide paint.
		   Never hide an active (open) panel — preparing+active must stay visible. */
		&.preparing:not(.active),
		&.warm-park:not(.active) {
			opacity: 0;
			pointer-events: none;
			z-index: 0;
			visibility: visible;
		}

		&:not(.active):not(.preparing):not(.warm-park),
		&:not(.active):not(.preparing):not(.warm-park) * {
			pointer-events: none !important;
		}
	}
</style>
