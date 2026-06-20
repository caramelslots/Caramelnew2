<!--
	BuyBonusConfirmOverlay.svelte — подтверждение покупки бонуса (WOK MENU).
	Собрано из тех же ассетов что BuyBonusOverlay: bg_buy_bonus_panel,
	normal/super_bonus_card, desk_l/desk_r, buy_button_bg, cross.
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

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const assetBase = `${import.meta.env.BASE_URL}assets/sprites/ui`;
	const bgUrl = `${assetBase}/buy_bonus/bg_buy_bonus_panel.png`;
	const normalCardUrl = `${assetBase}/buy_bonus/normal_bonus_card.png`;
	const superCardUrl = `${assetBase}/buy_bonus/super_bonus_card.png`;
	const closeIconUrl = `${assetBase}/autoplay/cross.png`;
	const deskLUrl = `${assetBase}/buy_bonus/desk_l.png`;
	const deskRUrl = `${assetBase}/buy_bonus/desk_r.png`;
	const buyButtonBgUrl = `${assetBase}/buy_bonus/buy_button_bg.png`;

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
	const showMultiplierBadge = $derived(isSuper);

	const cardTitle = $derived(
		isSuper ? context.i18nDerived.superBonus() : context.i18nDerived.normalBonus(),
	);
	const description = $derived(
		isSuper ? context.i18nDerived.buySuperDesc() : context.i18nDerived.buyNormalDesc(),
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
						class="confirm-card"
						class:card-normal={!isSuper}
						class:card-super={isSuper}
					>
						<img class="card-bg" src={cardUrl} alt="" draggable="false" />
						<div class="card-content">
							<h3 class="card-title">{cardTitle}</h3>
							<p class="card-desc">{description}</p>
							<div class="card-price-wrap" style:background-image="url('{deskUrl}')">
								<span class="card-price" data-test="buy-bonus-confirm-price">{price}</span>
							</div>
							{#if showMultiplierBadge}
								<span class="multiplier-badge">×3</span>
							{/if}
						</div>
					</article>
				</section>

				<footer class="confirm-actions">
					<button
						type="button"
						class="action-btn cancel-btn"
						style:background-image="url('{deskLUrl}')"
						onclick={goBack}
						data-test="buy-bonus-confirm-back"
					>
						{context.i18nDerived.buyCancel()}
					</button>
					<button
						type="button"
						class="action-btn confirm-btn"
						style:background-image="url('{buyButtonBgUrl}')"
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
		--panel-width: min(780px, 96vw);
		--panel-height-scale: 1.24;
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
		width: calc(var(--panel-width) * 0.1);
		height: calc(var(--panel-width) * 0.1);
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
		top: 24%;
		left: 50%;
		width: 34%;
		height: 44%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
	}

	.confirm-card {
		position: relative;
		height: 100%;
		width: auto;
		filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45));
	}

	.confirm-card.card-normal {
		aspect-ratio: 541 / 799;
	}

	.confirm-card.card-super {
		aspect-ratio: 552 / 803;
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
		transform: scale(0.92);
		transform-origin: 50% 58%;
	}

	.card-title {
		position: absolute;
		top: -2%;
		left: 10%;
		right: 10%;
		height: 8%;
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.024);
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
		height: 14%;
		margin: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.014);
		line-height: 1.15;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.015em;
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
		top: 72%;
		left: 50%;
		transform: translateX(-50%);
		width: 78%;
		height: 10%;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		background-position: center;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-price {
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.028);
		font-weight: 900;
		letter-spacing: 0.01em;
		text-align: center;
		line-height: 1;
		color: #f5e6c8;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
	}

	.multiplier-badge {
		position: absolute;
		top: 38%;
		right: 6%;
		min-width: calc(var(--panel-width) * 0.05);
		height: calc(var(--panel-width) * 0.044);
		padding: 0 calc(var(--panel-width) * 0.012);
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(180deg, #ffd96b 0%, #d6a233 100%);
		color: #2b1f08;
		font-family: 'proxima-nova', sans-serif;
		font-weight: 900;
		font-size: calc(var(--panel-width) * 0.018);
		letter-spacing: 0.02em;
		border-radius: calc(var(--panel-width) * 0.008);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
		border: calc(var(--panel-width) * 0.003) solid #2b1f08;
		pointer-events: none;
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
		gap: calc(var(--panel-width) * 0.02);
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

	.cancel-btn {
		color: #f5e6c8;
	}

	.confirm-btn {
		color: #f5e6c8;
	}

	/* Desktop */
	.confirm-panel:not(.portrait):not(.popout-l):not(.popout-s) {
		.close-button {
			width: calc(var(--panel-width) * 0.085);
			height: calc(var(--panel-width) * 0.085);
			margin-top: calc(var(--panel-width) * 0.06);
			margin-right: calc(var(--panel-width) * 0.03);
		}

		.confirm-card-section {
			top: 24%;
			width: 32%;
			height: 45%;
		}

		.card-content {
			transform: scale(0.88);
			transform-origin: 50% 59%;
		}

		.card-title {
			font-size: calc(var(--panel-width) * 0.022);
		}

		.card-desc {
			top: 58%;
			font-size: calc(var(--panel-width) * 0.016);
		}

		.card-price-wrap {
			top: 74%;
			height: 11%;
			width: 82%;
		}

		.card-price {
			font-size: calc(var(--panel-width) * 0.03);
		}

		.confirm-actions {
			top: 83%;
			left: 18%;
			right: 18%;
			height: 9%;
		}

		.action-btn {
			font-size: calc(var(--panel-width) * 0.02);
		}
	}

	/* Portrait */
	.confirm-panel.portrait:not(.popout-l):not(.popout-s) {
		--panel-height-scale: 1.24;
		height: min(calc(var(--panel-width) * var(--panel-height-scale)), 96vh);

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
			top: 82%;
			right: 7%;
			width: calc(var(--panel-width) * 0.075);
			height: calc(var(--panel-width) * 0.075);
			margin: 0;
		}

		.confirm-card-section {
			top: 24%;
			width: 40%;
			height: 42%;
		}

		.card-content {
			transform: scale(0.82);
			transform-origin: 50% 59%;
		}

		.card-title {
			font-size: calc(var(--panel-width) * 0.028);
		}

		.card-desc {
			font-size: calc(var(--panel-width) * 0.02);
		}

		.card-price {
			font-size: calc(var(--panel-width) * 0.032);
		}

		.confirm-actions {
			top: 81%;
			left: 14%;
			right: 14%;
			height: 11%;
		}

		.action-btn {
			font-size: calc(var(--panel-width) * 0.024);
		}
	}

	/* Popout L */
	.confirm-panel.popout-l {
		--panel-width: min(520px, 90vw);
		--panel-height-scale: 1.2;
		height: min(calc(var(--panel-width) * var(--panel-height-scale)), 94vh);
		filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.6));

		.close-button {
			width: calc(var(--panel-width) * 0.085);
			height: calc(var(--panel-width) * 0.085);
			margin-top: calc(var(--panel-width) * 0.06);
			margin-right: calc(var(--panel-width) * 0.03);
		}

		.confirm-card-section {
			width: 34%;
			height: 44%;
		}

		.card-content {
			transform: scale(0.88);
		}

		.confirm-actions {
			top: 82%;
			height: 10%;
		}
	}

	/* Popout S */
	.confirm-panel.popout-s {
		--panel-width: min(360px, 94vw);
		--panel-height-scale: 1.18;
		height: min(calc(var(--panel-width) * var(--panel-height-scale)), 96vh);
		filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.55));

		.close-button {
			width: calc(var(--panel-width) * 0.09);
			height: calc(var(--panel-width) * 0.09);
			margin-top: calc(var(--panel-width) * 0.055);
			margin-right: calc(var(--panel-width) * 0.025);
		}

		.confirm-card-section {
			top: 23%;
			width: 38%;
			height: 42%;
		}

		.card-content {
			transform: scale(0.78);
			transform-origin: 50% 58%;
		}

		.card-title {
			font-size: calc(var(--panel-width) * 0.026);
		}

		.card-desc {
			font-size: calc(var(--panel-width) * 0.017);
		}

		.card-price {
			font-size: calc(var(--panel-width) * 0.028);
		}

		.confirm-actions {
			top: 80%;
			left: 12%;
			right: 12%;
			height: 11%;
			gap: calc(var(--panel-width) * 0.015);
		}

		.action-btn {
			font-size: calc(var(--panel-width) * 0.022);
			padding-top: 10%;
		}
	}
</style>
