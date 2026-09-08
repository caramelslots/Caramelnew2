<!--
	Shared blur backdrop for buy-bonus menu + confirm.
	Shell JS loads after the bootstrap loader; card Pixi apps wait for first open
	so they do not compete with slot startup.
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
		if (isVisible) startBuyBonusFlowPreload();
	});
</script>

{#if shellMounted}
	<div
		class="buy-bonus-modal-shell"
		class:active={isVisible}
		aria-hidden={!isVisible}
		inert={!isVisible}
		data-test="buy-bonus-modal-shell"
	>
		<div
			class="panel-slot"
			class:active={showBuyPanel}
			aria-hidden={!showBuyPanel}
			inert={!showBuyPanel}
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

		&:not(.active),
		&:not(.active) * {
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

		&:not(.active),
		&:not(.active) * {
			pointer-events: none !important;
		}
	}
</style>
