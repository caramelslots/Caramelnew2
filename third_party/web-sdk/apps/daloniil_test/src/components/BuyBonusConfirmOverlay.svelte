<!--
	BuyBonusConfirmOverlay.svelte — подтверждение покупки бонуса (WOK MENU).
	bg_buy_bonus_confirm_panel + cancel/confirm button bg; карточка, cross — как в BuyBonusOverlay.
-->
<script lang="ts">
	import { stateModal, stateBet } from 'state-shared';
	import { stateBonus } from 'components-ui-html/src/stateBonus.svelte';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { getContextLayout } from 'utils-layout';

	import { clearActiveFeature } from '../game/activeFeature';
	import {
		BUY_NORMAL_COST_MULT,
		BUY_SUPER_COST_MULT,
		canAffordBuyBonus,
	} from '../game/buyBonusBalance';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';
	import { getContext } from '../game/context';
	import { AUTOSPIN_ASSETS, BUY_BONUS_ASSETS } from '../game/uiHtmlAssetManifest';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const bgUrl = BUY_BONUS_ASSETS.confirmBg;
	const normalCardUrl = BUY_BONUS_ASSETS.normalCard;
	const superCardUrl = BUY_BONUS_ASSETS.superCard;
	const closeIconUrl = AUTOSPIN_ASSETS.close;
	const cancelButtonBgUrl = BUY_BONUS_ASSETS.cancelButtonBg;
	const confirmButtonBgUrl = BUY_BONUS_ASSETS.confirmButtonBg;
	const deskLUrl = BUY_BONUS_ASSETS.deskL;
	const deskRUrl = BUY_BONUS_ASSETS.deskR;

	const isOpen = $derived(stateModal.modal?.name === 'buyBonusConfirm');
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);

	const isSuper = $derived(stateBonus.selectedBetModeKey === 'bonus_super');
	const multiplier = $derived(isSuper ? BUY_SUPER_COST_MULT : BUY_NORMAL_COST_MULT);
	const cardUrl = $derived(isSuper ? superCardUrl : normalCardUrl);
	const deskUrl = $derived(isSuper ? deskRUrl : deskLUrl);
	const price = $derived(numberToCurrencyString(stateBet.betAmount * multiplier));
	const canConfirm = $derived(canAffordBuyBonus(multiplier));

	const cardTitle = $derived(
		isSuper ? context.i18nDerived.superBonus() : context.i18nDerived.normalBonus(),
	);

	const goBack = () => {
		stateModal.modal = { name: 'buyBonus' };
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const closeAll = () => {
		stateModal.modal = null;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const confirm = () => {
		if (!canAffordBuyBonus(multiplier)) return;
		clearActiveFeature();
		stateBet.activeBetModeKey = stateBonus.selectedBetModeKey;
		stateModal.modal = null;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		context.eventEmitter.broadcast({ type: 'bet' });
	};
</script>

<svelte:window
	onkeydown={(e) => {
		if (isOpen && e.key === 'Escape') closeAll();
	}}
/>

{#if isOpen}
	<div class="backdrop">
		<div
			class="confirm-panel"
			class:portrait={isPortrait}
			class:popout-l={isPopout}
			class:popout-s={isPopoutSmall}
			role="dialog"
			aria-modal="true"
			data-test="buy-bonus-confirm-overlay"
		>
			<img class="panel-bg" src={bgUrl} alt="" draggable="false" />

			<div class="panel-content">
				<header class="panel-header">
					<button
						type="button"
						class="close-button"
						onclick={closeAll}
						aria-label="close"
						data-test="buy-bonus-confirm-close"
					>
						<img class="close-icon" src={closeIconUrl} alt="" draggable="false" />
					</button>
				</header>

				<section class="confirm-card-section" aria-label="selected bonus">
					<article
						class="card confirm-card"
						class:card-normal={!isSuper}
						class:card-super={isSuper}
					>
						<img class="card-bg" src={cardUrl} alt="" draggable="false" />
						<div class="card-content">
							<div class="card-title">{cardTitle}</div>
							{#if isSuper}
								<div class="card-desc card-desc-stacked">
									<span class="desc-spin-count">{context.i18nDerived.buySuperDescCount()}</span>
									<span class="desc-spin-label">{context.i18nDerived.buySuperDescSpins()}</span>
									<span class="desc-divider" aria-hidden="true"></span>
									<span class="desc-trigger">{context.i18nDerived.buySuperDescFeature()}</span>
								</div>
							{:else}
								<div class="card-desc card-desc-stacked">
									<span class="desc-spin-count">{context.i18nDerived.buyNormalDescCount()}</span>
									<span class="desc-spin-label">{context.i18nDerived.buyNormalDescSpins()}</span>
									<span class="desc-divider" aria-hidden="true"></span>
									<span class="desc-trigger">{context.i18nDerived.buyNormalDescTrigger()}</span>
								</div>
							{/if}
							<div class="card-price-wrap" style:background-image="url('{deskUrl}')">
								<span class="card-price" data-test="buy-bonus-confirm-price">{price}</span>
							</div>
						</div>
					</article>
				</section>

				<footer class="confirm-actions">
					<button
						type="button"
						class="action-btn cancel-btn"
						style:background-image="url('{cancelButtonBgUrl}')"
						onclick={goBack}
						data-test="buy-bonus-confirm-back"
					>
						{context.i18nDerived.buyCancel()}
					</button>
					<button
						type="button"
						class="action-btn confirm-btn"
						style:background-image="url('{confirmButtonBgUrl}')"
						disabled={!canConfirm}
						onclick={confirm}
						data-test="confirm-button"
					>
						{context.i18nDerived.buyConfirm()}
					</button>
				</footer>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 70;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		box-sizing: border-box;
	}

	.confirm-panel {
		--panel-width: min(700px, 90vw);
		--panel-height-scale: 1.32;
		position: relative;
		width: var(--panel-width);
		height: min(calc(var(--panel-width) * var(--panel-height-scale)), 98vh);
		pointer-events: auto;
		filter: drop-shadow(0 16px 42px rgba(0, 0, 0, 0.65));
	}

	.panel-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
	}

	.panel-content {
		position: absolute;
		inset: 0;
	}

	.panel-header {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 18%;
		display: flex;
		justify-content: flex-end;
		align-items: flex-start;
		padding: 0 8% 0 10%;
		box-sizing: border-box;
		pointer-events: none;
	}

	.close-button {
		width: calc(var(--panel-width) * 0.11);
		height: calc(var(--panel-width) * 0.11);
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: auto;
		transition:
			transform 0.12s,
			filter 0.12s;

		&:hover {
			filter: brightness(1.12);
			transform: scale(1.06);
		}

		&:active {
			transform: scale(0.96);
		}
	}

	.close-icon {
		width: 100%;
		height: 100%;
		object-fit: contain;
		transform: rotate(45deg);
		pointer-events: none;
		user-select: none;
	}

	.confirm-card-section {
		position: absolute;
		top: 25%;
		left: 49%;
		width: 79%;
		height: 55%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
	}

	.confirm-card-section .card {
		position: relative;
		height: 100%;
		width: auto;
		flex: 0 0 auto;
		filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45));
	}

	.card-normal,
	.card-super {
		aspect-ratio: 541 / 799;
	}

	.card-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
	}

	.card-content {
		position: absolute;
		inset: 0;
		transform: scale(0.8);
		transform-origin: 50% 61%;
	}

	.card-title {
		position: absolute;
		top: -5%;
		left: 10%;
		right: 10%;
		height: 8%;
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.021);
		font-weight: 900;
		font-style: italic;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		line-height: 1;
		text-align: center;
		color: #f5e6c8;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
	}

	.card-desc {
		position: absolute;
		top: 57%;
		left: 12%;
		right: 12%;
		height: 11%;
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.0135);
		line-height: 1.15;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.015em;
		text-align: center;
	}

	.card .card-desc.card-desc-stacked {
		top: 61%;
		height: 18%;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		gap: calc(var(--panel-width) * 0.0015);
		text-transform: uppercase;
		font-size: inherit;
	}

	.card .card-desc.card-desc-stacked .desc-spin-count {
		font-size: calc(var(--panel-width) * 0.086);
		font-weight: 900;
		line-height: 0.85;
		letter-spacing: -0.02em;
	}

	.card .card-desc.card-desc-stacked .desc-spin-label {
		font-size: calc(var(--panel-width) * 0.034);
		font-weight: 800;
		line-height: 1;
		letter-spacing: 0.05em;
	}

	.card .card-desc.card-desc-stacked .desc-divider {
		width: 76%;
		height: max(1px, calc(var(--panel-width) * 0.0028));
		margin: calc(var(--panel-width) * 0.002) 0 calc(var(--panel-width) * 0.001);
		background: currentColor;
		opacity: 0.9;
	}

	.card .card-desc.card-desc-stacked .desc-trigger {
		width: 100%;
		max-width: 100%;
		font-size: calc(var(--panel-width) * 0.019);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: 0.02em;
		white-space: nowrap;
		min-height: calc(var(--panel-width) * 0.024);
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.card-normal .card-desc {
		color: #4a3020;
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
	}

	.card-super .card-desc {
		color: #f5e0c0;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.75);
	}

	.card-price-wrap {
		position: absolute;
		top: 99%;
		left: 50%;
		transform: translateX(-50%);
		width: 110%;
		height: 18%;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		background-position: center;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-price {
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.033);
		font-weight: 900;
		letter-spacing: 0.01em;
		text-align: center;
		line-height: 1;
	}

	.card-normal .card-price {
		color: #f5e6c8;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
	}

	.card-super .card-price {
		color: #f5e6c8;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
	}

	.confirm-actions {
		position: absolute;
		top: 82%;
		left: 16%;
		right: 16%;
		height: 10%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: calc(var(--panel-width) * 0.07);
		box-sizing: border-box;
	}

	.action-btn {
		flex: 1 1 0;
		height: 100%;
		max-width: 46%;
		padding: 8% 4% 0;
		border: 0;
		border-radius: 0;
		cursor: pointer;
		background-color: transparent;
		background-repeat: no-repeat;
		background-position: center;
		background-size: 100% 100%;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.022);
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #f5e6c8;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
		transition:
			transform 0.1s,
			filter 0.15s,
			opacity 0.15s;

		&:hover:not(:disabled) {
			filter: brightness(1.1);
		}

		&:active:not(:disabled) {
			transform: translateY(1px);
		}

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
			pointer-events: none;
		}
	}

	.cancel-btn,
	.confirm-btn {
		flex: 0 1 auto;
		width: auto;
		max-width: 48%;
		aspect-ratio: 343 / 165;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: calc(var(--panel-width) * 0.032);
		line-height: 1;
		color: #f5e6c8;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
	}

	/* Desktop */
	.confirm-panel:not(.portrait):not(.popout-l):not(.popout-s) {
		.close-button {
			width: calc(var(--panel-width) * 0.095);
			height: calc(var(--panel-width) * 0.095);
			margin-top: calc(var(--panel-width) * 0.025);
			margin-right: 0;
		}

		.confirm-card-section {
			top: 25%;
			left: 49%;
			width: 79%;
			height: 55%;
		}

		.card {
			height: 100%;
		}

		.card-content {
			transform: scale(0.8);
			transform-origin: 50% 61%;
		}

		.card-price-wrap {
			top: 99%;
			height: 18%;
			width: 110%;
		}

		.card-price {
			font-size: calc(var(--panel-width) * 0.033);
		}

		.confirm-actions {
			top: 83%;
			left: 18%;
			right: 18%;
			height: 9%;
		}

		.action-btn {
			font-size: calc(var(--panel-width) * 0.028);
		}

		.cancel-btn,
		.confirm-btn {
			font-size: calc(var(--panel-width) * 0.028);
		}
	}

	/* Portrait */
	.confirm-panel.portrait:not(.popout-l):not(.popout-s) {
		--panel-height-scale: 1.42;
		height: min(calc(var(--panel-width) * var(--panel-height-scale)), 98vh);

		.panel-bg {
			width: 130%;
			top: 0;
			bottom: 0;
			left: 50%;
			right: auto;
			transform: translateX(-50%);
		}

		.panel-header {
			height: 22%;
		}

		.close-button {
			position: absolute;
			top: 40%;
			right: 1.5%;
			width: calc(var(--panel-width) * 0.11);
			height: calc(var(--panel-width) * 0.11);
			margin: 0;
		}

		.confirm-card-section {
			top: 25%;
			left: 49%;
			width: 79%;
			height: 51%;
		}

		.card {
			height: 100%;
		}

		.card-content {
			transform: scale(0.72);
			transform-origin: 50% 61%;
		}

		.card-title {
			top: -11%;
			font-size: calc(var(--panel-width) * 0.032);
		}

		.card .card-desc.card-desc-stacked {
			top: 66%;
			height: 22%;
		}

		.card .card-desc.card-desc-stacked .desc-spin-count {
			font-size: calc(var(--panel-width) * 0.112);
		}

		.card .card-desc.card-desc-stacked .desc-spin-label {
			font-size: calc(var(--panel-width) * 0.045);
		}

		.card .card-desc.card-desc-stacked .desc-trigger {
			font-size: calc(var(--panel-width) * 0.026);
			min-height: calc(var(--panel-width) * 0.032);
		}

		.card-price-wrap {
			top: 105%;
			height: 18%;
			width: 118%;
		}

		.card-price {
			font-size: calc(var(--panel-width) * 0.042);
		}

		.confirm-actions {
			top: 81%;
			left: 14%;
			right: 14%;
			height: 10%;
			gap: calc(var(--panel-width) * 0.08);
		}

		.action-btn {
			font-size: calc(var(--panel-width) * 0.034);
		}

		.cancel-btn,
		.confirm-btn {
			font-size: calc(var(--panel-width) * 0.034);
		}
	}

	/* Popout L */
	.confirm-panel.popout-l {
		--panel-width: min(470px, 86vw);
		--panel-height-scale: 1.28;
		height: min(calc(var(--panel-width) * var(--panel-height-scale)), 94vh);
		filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.6));

		.close-button {
			width: calc(var(--panel-width) * 0.095);
			height: calc(var(--panel-width) * 0.095);
			margin-top: calc(var(--panel-width) * 0.025);
			margin-right: 0;
		}

		.confirm-card-section {
			top: 25%;
			left: 49%;
			width: 79%;
			height: 55%;
		}

		.card {
			height: 100%;
		}

		.card-content {
			transform: scale(0.8);
			transform-origin: 50% 61%;
		}

		.card .card-desc.card-desc-stacked {
			height: 16%;
		}

		.card .card-desc.card-desc-stacked .desc-spin-count {
			font-size: calc(var(--panel-width) * 0.074);
		}

		.card .card-desc.card-desc-stacked .desc-spin-label {
			font-size: calc(var(--panel-width) * 0.028);
		}

		.card .card-desc.card-desc-stacked .desc-trigger {
			font-size: calc(var(--panel-width) * 0.016);
			min-height: calc(var(--panel-width) * 0.020);
		}

		.card-price-wrap {
			top: 99%;
			height: 18%;
			width: 110%;
		}

		.card-price {
			font-size: calc(var(--panel-width) * 0.033);
		}

		.confirm-actions {
			top: 82%;
			height: 10%;
		}
	}

	/* Popout S */
	.confirm-panel.popout-s {
		--panel-width: min(240px, 60vw);
		--panel-height-scale: 1.28;
		height: min(calc(var(--panel-width) * var(--panel-height-scale)), 94vh);
		filter: drop-shadow(0 calc(var(--panel-width) * 0.025) calc(var(--panel-width) * 0.075) rgba(0, 0, 0, 0.55));

		.close-button {
			width: calc(var(--panel-width) * 0.095);
			height: calc(var(--panel-width) * 0.095);
			margin-top: calc(var(--panel-width) * 0.025);
			margin-right: 0;
		}

		.confirm-card-section {
			top: 25%;
			left: 49%;
			width: 79%;
			height: 55%;
		}

		.card {
			height: 100%;
		}

		.card-content {
			transform: scale(0.8);
			transform-origin: 50% 61%;
		}

		.card .card-desc.card-desc-stacked {
			height: 16%;
		}

		.card .card-desc.card-desc-stacked .desc-spin-count {
			font-size: calc(var(--panel-width) * 0.074);
		}

		.card .card-desc.card-desc-stacked .desc-spin-label {
			font-size: calc(var(--panel-width) * 0.028);
		}

		.card .card-desc.card-desc-stacked .desc-trigger {
			font-size: calc(var(--panel-width) * 0.016);
			min-height: calc(var(--panel-width) * 0.020);
		}

		.card-price-wrap {
			top: 99%;
			height: 18%;
			width: 110%;
		}

		.card-price {
			font-size: calc(var(--panel-width) * 0.033);
		}

		.confirm-actions {
			top: 83%;
			left: 18%;
			right: 18%;
			height: 9%;
		}

		.action-btn {
			font-size: calc(var(--panel-width) * 0.028);
		}

		.cancel-btn,
		.confirm-btn {
			font-size: calc(var(--panel-width) * 0.028);
		}
	}

	@media (max-width: 600px) {
		.confirm-panel.portrait:not(.popout-l):not(.popout-s) {
			--panel-height-scale: 1.5;
			height: min(calc(var(--panel-width) * var(--panel-height-scale)), 98vh);

			.confirm-card-section {
				height: 49%;
			}

			.confirm-actions {
				height: 9.7%;
			}
		}
	}
</style>
