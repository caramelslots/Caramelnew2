<!--
	Shared blur backdrop for buy-bonus menu + confirm.
	Keep card SpinePlayers warm while basegame allows — park the buy panel off-screen
	so open does not wait on WebGL compile.
-->
<script lang="ts">
	import { stateModal } from 'state-shared';

	import BuyBonusOverlay from './BuyBonusOverlay.svelte';
	import BuyBonusConfirmOverlay from './BuyBonusConfirmOverlay.svelte';
	import BuyDuelPickOverlay from './BuyDuelPickOverlay.svelte';
	import {
		clearBuyBonusFeatureEvictLock,
		shouldKeepBuyBonusWarm,
	} from '../game/buyBonusSharedPixi';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { startBuyBonusFlowPreload } from '../game/uiHtmlAssetManifest';
	import { releaseAllBuyBonusCardSpinePlayers } from '../game/buyBonusCardGpu';
	import { releaseAllDuelPickSpinePlayers } from '../game/duelPickGpu';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { stateGame } from '../game/stateGame.svelte';

	const shellMounted = $derived(gameEntrance.showContent);
	const showBuyPanel = $derived(stateModal.modal?.name === 'buyBonus');
	const showConfirmPanel = $derived(stateModal.modal?.name === 'buyBonusConfirm');
	const showDuelPickPanel = $derived(stateModal.modal?.name === 'buyDuelPick');
	const isBuyFlowOpen = $derived(showBuyPanel || showConfirmPanel || showDuelPickPanel);

	/** Park buy-panel DOM (+ SpinePlayers) as soon as content shows — don't wait for lift end. */
	const keepBuyWarm = $derived(
		gameEntrance.showContent &&
			(() => {
				void stateGame.gameType;
				void stateGame.freeSpinIntroActive;
				void stateGame.transitionActive;
				void stateGame.targetPickOpen;
				void stateGame.targetPickSlide;
				void stateGame.drumShootActive;
				void stateDuel.active;
				void gameEntrance.buyBonusFeatureEvictLock;
				return shouldKeepBuyBonusWarm();
			})(),
	);
	const mountBuyPanel = $derived(showBuyPanel || showConfirmPanel || keepBuyWarm);
	/** Confirm has no own spines — only mounts when open and reparents the menu portal. */
	const mountConfirmPanel = $derived(showConfirmPanel);

	/** Blur shell only when buy panel is painted — avoid empty-card flash. */
	const isVisible = $derived(
		(showBuyPanel && gameEntrance.buyBonusPanelReady) || showConfirmPanel || showDuelPickPanel,
	);
	/** Dim while first open waits for spines (warm miss). */
	const isPreparingBuy = $derived(showBuyPanel && !gameEntrance.buyBonusPanelReady);
	/** Park warm hosts off-screen with real layout size so WebGL can compile. */
	const isWarmParked = $derived(mountBuyPanel && !showBuyPanel);

	/** Opening buy flow after a feature must drop the eviction lock or warm never returns. */
	$effect(() => {
		if (!isBuyFlowOpen) return;
		clearBuyBonusFeatureEvictLock();
	});

	$effect(() => {
		if (isBuyFlowOpen || keepBuyWarm) {
			startBuyBonusFlowPreload();
		}
		if (isBuyFlowOpen) return;
		releaseAllDuelPickSpinePlayers();
		if (!keepBuyWarm) releaseAllBuyBonusCardSpinePlayers();
	});
</script>

{#if shellMounted}
	<div
		class="buy-bonus-modal-shell"
		class:active={isVisible}
		class:preparing={isPreparingBuy}
		class:warm={isWarmParked}
		aria-hidden={!isVisible}
		inert={!isVisible && !isPreparingBuy}
		data-test="buy-bonus-modal-shell"
	>
		<div
			class="panel-slot"
			class:active={showBuyPanel && gameEntrance.buyBonusPanelReady}
			class:preparing={isPreparingBuy}
			class:warm-park={isWarmParked}
			aria-hidden={!showBuyPanel}
			inert={!showBuyPanel || !gameEntrance.buyBonusPanelReady}
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

		/* Instant feedback on tap: dim while spines flush, then reveal cards. */
		&.preparing:not(.active) {
			opacity: 1;
			visibility: visible;
			pointer-events: auto;
			background: rgba(0, 0, 0, 0.5);
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
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

		/* Layout hosts off-screen while spines flush — keep size, hide paint. */
		&.preparing,
		&.warm-park {
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
