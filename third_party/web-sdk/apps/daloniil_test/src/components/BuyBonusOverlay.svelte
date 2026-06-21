<!--
	BuyBonusOverlay.svelte — меню «Купить функцию» по designer_assets/bg wok menu.png.
	Открывается при stateModal.modal?.name === 'buyBonus'. Масштабируется через
	--panel-width для desktop, portrait, popout L (800×450) и popout S (400×225).
-->
<script lang="ts">
	import { stateModal, stateBet, stateBetDerived, stateConfig } from 'state-shared';
	import { stateBonus } from 'components-ui-html/src/stateBonus.svelte';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { clearActiveFeature } from '../game/activeFeature';
	import {
		BUY_NORMAL_COST_MULT,
		BUY_SUPER_COST_MULT,
		canAffordBuyBonus,
	} from '../game/buyBonusBalance';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';
	import { getContext } from '../game/context';
	import { getContextLayout } from 'utils-layout';
	import { AUTOSPIN_ASSETS, BUY_BONUS_ASSETS, HUD_ASSETS } from '../game/uiHtmlAssetManifest';
	import CashStacksFeatureToggles from './CashStacksFeatureToggles.svelte';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const bgUrl = BUY_BONUS_ASSETS.menuBg;
	const normalCardUrl = BUY_BONUS_ASSETS.normalCard;
	const superCardUrl = BUY_BONUS_ASSETS.superCard;
	const closeIconUrl = AUTOSPIN_ASSETS.close;
	const deskLUrl = BUY_BONUS_ASSETS.deskL;
	const deskRUrl = BUY_BONUS_ASSETS.deskR;
	const buyButtonBgUrl = BUY_BONUS_ASSETS.buyButtonBg;
	const minusUrl = HUD_ASSETS.betMinus;
	const plusUrl = HUD_ASSETS.betPlus;

	const isOpen = $derived(stateModal.modal?.name === 'buyBonus');
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);

	type BonusVariant = 'normal' | 'super';

	const normalPrice = $derived(numberToCurrencyString(stateBet.betAmount * BUY_NORMAL_COST_MULT));
	const superPrice = $derived(numberToCurrencyString(stateBet.betAmount * BUY_SUPER_COST_MULT));
	const currentBet = $derived(numberToCurrencyString(stateBet.betAmount));
	const canBuyNormal = $derived(canAffordBuyBonus(BUY_NORMAL_COST_MULT));
	const canBuySuper = $derived(canAffordBuyBonus(BUY_SUPER_COST_MULT));
	const featureTogglesDisabled = $derived(!context.stateXstateDerived.isIdle());

	const betOptions = $derived([...stateConfig.betAmountOptions].sort((a, b) => a - b));
	const minBet = $derived(betOptions[0]);
	const maxBet = $derived(betOptions[betOptions.length - 1]);
	const canDecrease = $derived(stateBet.betAmount > minBet);
	const canIncrease = $derived(stateBet.betAmount < maxBet);

	const decreaseBet = () => {
		const prev = [...betOptions].reverse().find((opt) => opt < stateBet.betAmount);
		if (prev != null) {
			stateBetDerived.setBetAmount(prev);
			context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		}
	};

	const increaseBet = () => {
		const next = betOptions.find((opt) => opt > stateBet.betAmount);
		if (next != null) {
			stateBetDerived.setBetAmount(next);
			context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		}
	};

	const onBuy = (variant: BonusVariant) => {
		const costMult = variant === 'normal' ? BUY_NORMAL_COST_MULT : BUY_SUPER_COST_MULT;
		if (!canAffordBuyBonus(costMult)) return;
		clearActiveFeature();
		stateBonus.selectedBetModeKey = variant === 'normal' ? 'bonus_normal' : 'bonus_super';
		stateModal.modal = { name: 'buyBonusConfirm' };
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const close = () => {
		stateModal.modal = null;
	};
</script>

<div
	class="buy-bonus-panel"
	class:portrait={isPortrait}
	class:popout-l={isPopout}
	class:popout-s={isPopoutSmall}
	data-test="buy-bonus-overlay"
	aria-hidden={!isOpen}
>
	<img class="panel-bg" src={bgUrl} alt="" draggable="false" />

	<div class="panel-content">
		<header class="panel-header">
			<!-- panel-title hidden by design -->
			<button
				type="button"
				class="close-button"
				onclick={close}
				aria-label="close"
				data-test="buy-bonus-close"
			>
				<img class="close-icon" src={closeIconUrl} alt="" draggable="false" />
			</button>
		</header>

		<section class="cards-section" aria-label="bonus options">
			<button
				type="button"
				class="card card-normal"
				data-test="bonus-card-normal"
				disabled={!canBuyNormal}
				onclick={() => onBuy('normal')}
			>
				<img class="card-bg" src={normalCardUrl} alt="" draggable="false" />
				<div class="card-content">
					<div class="card-title">{context.i18nDerived.normalBonus()}</div>
					<div class="card-desc card-desc-stacked">
						<span class="desc-spin-count">{context.i18nDerived.buyNormalDescCount()}</span>
						<span class="desc-spin-label">{context.i18nDerived.buyNormalDescSpins()}</span>
						<span class="desc-divider" aria-hidden="true"></span>
						<span class="desc-trigger">{context.i18nDerived.buyNormalDescTrigger()}</span>
					</div>
					<div class="card-price-wrap" style:background-image="url('{deskLUrl}')">
						<span class="card-price" data-test="bonus-price-normal">{normalPrice}</span>
					</div>
					<div class="buy-button" style:background-image="url('{buyButtonBgUrl}')">
						{context.i18nDerived.buyConfirm()}
					</div>
				</div>
			</button>

			<button
				type="button"
				class="card card-super"
				data-test="bonus-card-super"
				disabled={!canBuySuper}
				onclick={() => onBuy('super')}
			>
				<img class="card-bg" src={superCardUrl} alt="" draggable="false" />
				<div class="card-content">
					<div class="card-title">{context.i18nDerived.superBonus()}</div>
					<div class="card-desc card-desc-stacked">
						<span class="desc-spin-count">{context.i18nDerived.buySuperDescCount()}</span>
						<span class="desc-spin-label">{context.i18nDerived.buySuperDescSpins()}</span>
						<span class="desc-divider" aria-hidden="true"></span>
						<span class="desc-trigger">{context.i18nDerived.buySuperDescFeature()}</span>
					</div>
					<div class="card-price-wrap" style:background-image="url('{deskRUrl}')">
						<span class="card-price" data-test="bonus-price-super">{superPrice}</span>
					</div>
					<div class="buy-button" style:background-image="url('{buyButtonBgUrl}')">
						{context.i18nDerived.buyConfirm()}
					</div>
				</div>
			</button>
		</section>

		<section class="features-section" aria-label={context.i18nDerived.autoplayFeatures()}>
			<CashStacksFeatureToggles
				features={['bonus_boost']}
				disabled={featureTogglesDisabled}
				showMenuCatIcon
				noHoverBg
			/>
		</section>

		<footer class="bet-adjuster">
			<button
				type="button"
				class="bet-btn"
				style:background-image="url('{minusUrl}')"
				onclick={decreaseBet}
				disabled={!canDecrease}
				aria-label="decrease bet"
				data-test="bet-decrease"
			></button>
			<div class="bet-display">
				<span class="bet-label">{context.i18nDerived.bet().toUpperCase()}</span>
				<span class="bet-value" data-test="bet-value">{currentBet}</span>
			</div>
			<button
				type="button"
				class="bet-btn"
				style:background-image="url('{plusUrl}')"
				onclick={increaseBet}
				disabled={!canIncrease}
				aria-label="increase bet"
				data-test="bet-increase"
			></button>
		</footer>
	</div>
</div>

<style lang="scss">
	.buy-bonus-panel {
		--panel-width: min(700px, 90vw);
		--panel-height-scale: 1.32;
		position: relative;
		z-index: 10;
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
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: start;
		padding: 0 8% 0 10%;
		box-sizing: border-box;
		pointer-events: none;
	}

	.panel-title {
		margin: calc(var(--panel-width) * 0.072) 0 0;
		grid-column: 1;
		width: 100%;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.062);
		font-style: italic;
		font-weight: 900;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #e8b4ff;
		text-shadow:
			0 0 8px rgba(255, 80, 220, 0.85),
			0 0 16px rgba(180, 60, 255, 0.55),
			0 2px 6px rgba(0, 0, 0, 0.85);
		text-align: center;
		line-height: 1.05;
		pointer-events: none;
	}

	.close-button {
		position: relative;
		grid-column: 2;
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

	.cards-section {
		position: absolute;
		top: 24.2%;
		left: 49%;
		width: 80%;
		height: 46%;
		transform: translateX(-50%);
		display: flex;
		justify-content: center;
		align-items: center;
		gap: calc(var(--panel-width) * 0.014);
		box-sizing: border-box;
	}

	.card {
		position: relative;
		height: 91%;
		width: auto;
		flex: 0 1 auto;
		min-width: 0;
		filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45));
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
		text-align: left;
		transition:
			filter 0.15s,
			transform 0.1s;

		&:hover:not(:disabled) {
			filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45)) brightness(1.08);
		}

		&:active:not(:disabled) {
			transform: scale(0.97);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
			pointer-events: none;
		}
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
		transform: scale(0.83);
		transform-origin: 50% 60%;
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
		font-size: calc(var(--panel-width) * 0.072);
		font-weight: 900;
		line-height: 0.85;
		letter-spacing: -0.02em;
	}

	.card .card-desc.card-desc-stacked .desc-spin-label {
		font-size: calc(var(--panel-width) * 0.028);
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
		font-size: calc(var(--panel-width) * 0.016);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: 0.02em;
		white-space: nowrap;
		min-height: calc(var(--panel-width) * 0.02);
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
		top: 80%;
		left: 50%;
		transform: translateX(-50%);
		width: 108%;
		height: 14%;
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
	}

	.card-normal .card-price {
		color: #f5e6c8;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
	}

	.card-super .card-price {
		color: #f5e6c8;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
	}

	.buy-button {
		position: absolute;
		top: 94%;
		left: 50%;
		transform: translateX(-50%);
		width: 50%;
		height: 10%;
		padding: 4.5% 0 0 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.024);
		font-weight: 900;
		letter-spacing: 0.06em;
		border: 0;
		border-radius: 0;
		cursor: pointer;
		text-transform: uppercase;
		background-size: 100% 100%;
		background-repeat: no-repeat;
		background-color: transparent;
		box-shadow: none;
		transition:
			transform 0.1s,
			filter 0.15s;
		color: #f5e6c8;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);

		&:hover:not(:disabled) {
			filter: brightness(1.1);
		}

		&:active:not(:disabled) {
			transform: translateX(-50%) translateY(1px);
		}

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
			pointer-events: none;
		}
	}

	.features-section {
		position: absolute;
		top: 77.9%;
		left: 19%;
		right: 21.5%;
		height: 5.8%;
		display: flex;
		align-items: center;
		padding: 0;
		box-sizing: border-box;
		overflow: visible;
	}

	.features-section :global(.feature-row) {
		width: 100%;
		height: 100%;
		display: grid;
		grid-template-columns: 14% minmax(0, 1fr) auto;
		align-items: center;
		padding: 0 3% 0 2.5%;
		column-gap: calc(var(--panel-width) * 0.01);
		background: transparent;
		border: 0;
		border-radius: 0;
		gap: 0;
		box-sizing: border-box;

		&:hover:not(:disabled),
		&:active:not(:disabled) {
			background: transparent;
			filter: none;
			transform: none;
		}
	}

	.features-section :global(.feature-cat-icon) {
		grid-column: 1;
		justify-self: center;
		align-self: center;
		width: calc(var(--panel-width) * 0.044);
		height: calc(var(--panel-width) * 0.044);
		max-height: 95%;
		object-fit: contain;
		pointer-events: none;
		user-select: none;
		transform: none;
	}

	.features-section :global(.feature-info) {
		grid-column: 2;
		justify-self: start;
		align-self: center;
		min-width: 0;
		max-width: 100%;
		margin-left: calc(var(--panel-width) * 0.008);
		padding-top: 0;
		gap: calc(var(--panel-width) * 0.002);
		overflow: visible;
	}

	.features-section :global(.feature-row.compact .feature-name),
	.features-section :global(.feature-row .feature-name) {
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.026);
		font-style: italic;
		font-weight: 900;
		text-transform: uppercase;
		color: #d4b44a;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.85),
			0 2px 6px rgba(0, 0, 0, 0.65);
		line-height: 1.1;
		letter-spacing: 0.03em;
		max-width: 100%;
		overflow: visible;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.features-section :global(.feature-cost) {
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.0185);
		font-weight: 700;
		color: #4cd964;
		letter-spacing: 0.02em;
		line-height: 1.1;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.75);
		max-width: 100%;
		overflow: visible;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.features-section :global(.feature-toggle) {
		grid-column: 3;
		justify-self: end;
		align-self: center;
		width: calc(var(--panel-width) * 0.062);
		height: calc(var(--panel-width) * 0.033);
		flex-shrink: 0;
		background: rgba(0, 0, 0, 0.55);
		transform: none;
		margin-right: calc(var(--panel-width) * 0.004);
	}

	.features-section :global(.feature-toggle.on) {
		background: #4cd964;
	}

	.features-section :global(.feature-toggle .knob) {
		width: calc(var(--panel-width) * 0.027);
		height: calc(var(--panel-width) * 0.027);
		top: calc((var(--panel-width) * 0.033 - var(--panel-width) * 0.027) / 2);
		left: calc((var(--panel-width) * 0.033 - var(--panel-width) * 0.027) / 2);
		background: #8a8a8a;
	}

	.features-section :global(.feature-toggle.on .knob) {
		left: calc(
			var(--panel-width) * 0.062 - var(--panel-width) * 0.027 -
				(var(--panel-width) * 0.033 - var(--panel-width) * 0.027) / 2
		);
		background: #fff;
	}

	.bet-adjuster {
		position: absolute;
		top: calc(85.5% - 2px);
		left: 14%;
		right: 14%;
		height: 10%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: calc(var(--panel-width) * 0.028);
		box-sizing: border-box;
	}

	.bet-btn {
		width: calc(var(--panel-width) * 0.118);
		height: calc(var(--panel-width) * 0.118);
		padding: 0;
		border: 0;
		background-color: transparent;
		background-repeat: no-repeat;
		background-position: center;
		background-size: contain;
		cursor: pointer;
		transition:
			transform 0.1s,
			filter 0.12s,
			opacity 0.12s;

		&:hover:not(:disabled) {
			filter: brightness(1.1);
			transform: scale(1.04);
		}

		&:active:not(:disabled) {
			transform: scale(0.96);
		}

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
			pointer-events: none;
		}
	}

	.bet-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: calc(var(--panel-width) * 0.004);
		min-width: calc(var(--panel-width) * 0.28);
	}

	.bet-label {
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.026);
		font-weight: 800;
		line-height: 1;
		color: #d4b44a;
		letter-spacing: 0.08em;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.75);
	}

	.bet-value {
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.036);
		font-weight: 900;
		line-height: 1;
		margin-top: 0;
		color: #fff;
		text-shadow: 0 1px 6px rgba(0, 0, 0, 0.75);
	}

	/* Desktop — компактные карточки, Bonus Boost в золотой рамке */
	.buy-bonus-panel:not(.portrait):not(.popout-l):not(.popout-s) {
		.panel-title {
			display: none;
		}

		.close-button {
			width: calc(var(--panel-width) * 0.085);
			height: calc(var(--panel-width) * 0.085);
			margin-top: calc(var(--panel-width) * 0.06);
			margin-right: calc(var(--panel-width) * 0.03);
		}

		.cards-section {
			top: 24.5%;
			left: 49%;
			width: 79%;
			height: 46%;
			gap: calc(var(--panel-width) * 0.012);
		}

		.card {
			height: 91%;
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

		.buy-button {
			top: 112%;
			width: 68%;
			height: 18%;
			font-size: calc(var(--panel-width) * 0.025);
		}

		.bet-adjuster {
			top: calc(87% - 2px);
			left: 49%;
			right: auto;
			width: 72%;
			transform: translateX(-50%);
			height: 6%;
			gap: calc(var(--panel-width) * 0.014);
		}

		.bet-btn {
			width: calc(var(--panel-width) * 0.064);
			height: calc(var(--panel-width) * 0.064);
		}

		.bet-display {
			min-width: calc(var(--panel-width) * 0.18);
		}

		.bet-label {
			font-size: calc(var(--panel-width) * 0.019);
		}

		.bet-value {
			font-size: calc(var(--panel-width) * 0.023);
		}

		.features-section {
			top: 79.2%;
			left: 22%;
			right: 24.5%;
			height: 5.4%;
			padding: 0;
		}

		.features-section :global(.feature-row) {
			height: 100%;
			padding: 0 2.5% 0 2%;
			grid-template-columns: 13% minmax(0, 1fr) auto;
		}

		.features-section :global(.feature-cat-icon) {
			width: calc(var(--panel-width) * 0.04);
			height: calc(var(--panel-width) * 0.04);
		}

		.features-section :global(.feature-info) {
			margin-left: calc(var(--panel-width) * 0.006);
			gap: calc(var(--panel-width) * 0.001);
		}

		.features-section :global(.feature-row .feature-name) {
			font-size: calc(var(--panel-width) * 0.021);
			line-height: 1.08;
		}

		.features-section :global(.feature-cost) {
			font-size: calc(var(--panel-width) * 0.0165);
			line-height: 1.08;
		}

		.features-section :global(.feature-toggle) {
			width: calc(var(--panel-width) * 0.054);
			height: calc(var(--panel-width) * 0.029);
			margin-right: 0;
		}

		.features-section :global(.feature-toggle .knob) {
			width: calc(var(--panel-width) * 0.023);
			height: calc(var(--panel-width) * 0.023);
			top: calc((var(--panel-width) * 0.029 - var(--panel-width) * 0.023) / 2);
			left: calc((var(--panel-width) * 0.029 - var(--panel-width) * 0.023) / 2);
		}

		.features-section :global(.feature-toggle.on .knob) {
			left: calc(
				var(--panel-width) * 0.054 - var(--panel-width) * 0.023 -
					(var(--panel-width) * 0.029 - var(--panel-width) * 0.023) / 2
			);
		}
	}

	/* Portrait mobile */
	.buy-bonus-panel.portrait:not(.popout-l):not(.popout-s) {
		--panel-height-scale: 1.32;
		height: min(calc(var(--panel-width) * var(--panel-height-scale)), 96vh);

		.panel-bg {
			width: 130%;
			top: 0;
			bottom: 0;
			left: 50%;
			right: auto;
			transform: translateX(-50%);
		}

		.panel-title {
			display: none;
		}

		.panel-header {
			height: 22%;
		}

		.close-button {
			position: absolute;
			top: 35%;
			right: 7%;
			width: calc(var(--panel-width) * 0.095);
			height: calc(var(--panel-width) * 0.095);
			margin: 0;
		}

		.cards-section {
			top: 24.5%;
			left: 49%;
			width: 79%;
			height: 46%;
			gap: calc(var(--panel-width) * 0.012);
		}

		.card {
			height: 91%;
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
			font-size: calc(var(--panel-width) * 0.094);
		}

		.card .card-desc.card-desc-stacked .desc-spin-label {
			font-size: calc(var(--panel-width) * 0.037);
		}

		.card .card-desc.card-desc-stacked .desc-trigger {
			font-size: calc(var(--panel-width) * 0.021);
			min-height: calc(var(--panel-width) * 0.026);
		}

		.card-price-wrap {
			top: 105%;
			height: 18%;
			width: 118%;
		}

		.card-price {
			font-size: calc(var(--panel-width) * 0.042);
		}

		.buy-button {
			top: 120%;
			width: 76%;
			height: 19%;
			font-size: calc(var(--panel-width) * 0.038);
		}

		.bet-adjuster {
			top: calc(87% - 2px);
			left: 49%;
			right: auto;
			width: 76%;
			transform: translateX(-50%);
			height: 7%;
			gap: calc(var(--panel-width) * 0.02);
		}

		.bet-btn {
			width: calc(var(--panel-width) * 0.09);
			height: calc(var(--panel-width) * 0.09);
		}

		.bet-display {
			min-width: calc(var(--panel-width) * 0.22);
		}

		.bet-label {
			font-size: calc(var(--panel-width) * 0.026);
		}

		.bet-value {
			font-size: calc(var(--panel-width) * 0.033);
		}

		.features-section {
			top: 78.6%;
			left: 14%;
			right: 18%;
			height: 6.5%;
			padding: 0;
			overflow: visible;
		}

		.features-section :global(.feature-cat-icon) {
			width: calc(var(--panel-width) * 0.07) !important;
			height: calc(var(--panel-width) * 0.07) !important;
			min-width: calc(var(--panel-width) * 0.07) !important;
			min-height: calc(var(--panel-width) * 0.07) !important;
			transform: translateY(5%);
			flex-shrink: 0 !important;
		}

		.features-section :global(.feature-row) {
			height: 100%;
			padding: 0 2.5% 0 2%;
			grid-template-columns: 22% minmax(0, 1fr) auto;
			overflow: visible;
		}

		.features-section :global(.feature-info) {
			margin-left: calc(var(--panel-width) * 0.006);
			gap: calc(var(--panel-width) * 0.001);
		}

		.features-section :global(.feature-row .feature-name) {
			font-size: calc(var(--panel-width) * 0.03);
			line-height: 1.08;
		}

		.features-section :global(.feature-cost) {
			font-size: calc(var(--panel-width) * 0.026);
			line-height: 1.08;
		}

		.features-section :global(.feature-toggle) {
			width: calc(var(--panel-width) * 0.072);
			height: calc(var(--panel-width) * 0.038);
			margin-right: 0;
		}

		.features-section :global(.feature-toggle .knob) {
			width: calc(var(--panel-width) * 0.03);
			height: calc(var(--panel-width) * 0.03);
			top: calc((var(--panel-width) * 0.038 - var(--panel-width) * 0.03) / 2);
			left: calc((var(--panel-width) * 0.038 - var(--panel-width) * 0.03) / 2);
		}

		.features-section :global(.feature-toggle.on .knob) {
			left: calc(
				var(--panel-width) * 0.072 - var(--panel-width) * 0.03 -
					(var(--panel-width) * 0.038 - var(--panel-width) * 0.03) / 2
			);
		}
	}

	/* Stake popout L — 800×450 */
	.buy-bonus-panel.popout-l {
		--panel-width: min(470px, 86vw);
		--panel-height-scale: 1.28;
		height: min(calc(var(--panel-width) * var(--panel-height-scale)), 94vh);
		filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.6));

		.panel-title {
			display: none;
		}

		.close-button {
			width: calc(var(--panel-width) * 0.085);
			height: calc(var(--panel-width) * 0.085);
			margin-top: calc(var(--panel-width) * 0.06);
			margin-right: calc(var(--panel-width) * 0.03);
		}

		.cards-section {
			top: 24.5%;
			left: 49%;
			width: 79%;
			height: 46%;
			gap: calc(var(--panel-width) * 0.012);
		}

		.card {
			height: 91%;
		}

		.card-content {
			transform: scale(0.8);
			transform-origin: 50% 61%;
		}

		.card .card-desc.card-desc-stacked {
			height: 16%;
		}

		.card .card-desc.card-desc-stacked .desc-spin-count {
			font-size: calc(var(--panel-width) * 0.062);
		}

		.card .card-desc.card-desc-stacked .desc-spin-label {
			font-size: calc(var(--panel-width) * 0.023);
		}

		.card .card-desc.card-desc-stacked .desc-trigger {
			font-size: calc(var(--panel-width) * 0.013);
			min-height: calc(var(--panel-width) * 0.017);
		}

		.card-price-wrap {
			top: 99%;
			height: 18%;
			width: 110%;
		}

		.card-price {
			font-size: calc(var(--panel-width) * 0.033);
		}

		.buy-button {
			top: 113%;
			width: 75%;
			height: 18%;
			font-size: calc(var(--panel-width) * 0.028);
		}

		.bet-adjuster {
			top: calc(87% - 2px);
			left: 49%;
			right: auto;
			width: 72%;
			transform: translateX(-50%);
			height: 6%;
			gap: calc(var(--panel-width) * 0.014);
		}

		.bet-btn {
			width: calc(var(--panel-width) * 0.064);
			height: calc(var(--panel-width) * 0.064);
		}

		.bet-display {
			min-width: calc(var(--panel-width) * 0.18);
		}

		.bet-label {
			font-size: calc(var(--panel-width) * 0.019);
		}

		.bet-value {
			font-size: calc(var(--panel-width) * 0.023);
		}

		.features-section {
			top: 79.2%;
			left: 22%;
			right: 24.5%;
			height: 5.4%;
			padding: 0;
		}

		.features-section :global(.feature-row) {
			height: 100%;
			padding: 0 2.5% 0 2%;
			grid-template-columns: 13% minmax(0, 1fr) auto;
		}

		.features-section :global(.feature-cat-icon) {
			width: calc(var(--panel-width) * 0.04);
			height: calc(var(--panel-width) * 0.04);
		}

		.features-section :global(.feature-info) {
			margin-left: calc(var(--panel-width) * 0.006);
			gap: calc(var(--panel-width) * 0.001);
		}

		.features-section :global(.feature-row .feature-name) {
			font-size: calc(var(--panel-width) * 0.021);
			line-height: 1.08;
		}

		.features-section :global(.feature-cost) {
			font-size: calc(var(--panel-width) * 0.0165);
			line-height: 1.08;
		}

		.features-section :global(.feature-toggle) {
			width: calc(var(--panel-width) * 0.054);
			height: calc(var(--panel-width) * 0.029);
			margin-right: 0;
		}

		.features-section :global(.feature-toggle .knob) {
			width: calc(var(--panel-width) * 0.023);
			height: calc(var(--panel-width) * 0.023);
			top: calc((var(--panel-width) * 0.029 - var(--panel-width) * 0.023) / 2);
			left: calc((var(--panel-width) * 0.029 - var(--panel-width) * 0.023) / 2);
		}

		.features-section :global(.feature-toggle.on .knob) {
			left: calc(
				var(--panel-width) * 0.054 - var(--panel-width) * 0.023 -
					(var(--panel-width) * 0.029 - var(--panel-width) * 0.023) / 2
			);
		}
	}

	/* Stake popout S — 400×225 (те же пропорции что popout L, меньший --panel-width) */
	.buy-bonus-panel.popout-s {
		--panel-width: min(240px, 60vw);
		--panel-height-scale: 1.28;
		height: min(calc(var(--panel-width) * var(--panel-height-scale)), 94vh);
		filter: drop-shadow(
			0 calc(var(--panel-width) * 0.025) calc(var(--panel-width) * 0.075) rgba(0, 0, 0, 0.55)
		);

		.panel-title {
			display: none;
		}

		.close-button {
			width: calc(var(--panel-width) * 0.085);
			height: calc(var(--panel-width) * 0.085);
			margin-top: calc(var(--panel-width) * 0.06);
			margin-right: calc(var(--panel-width) * 0.03);
		}

		.cards-section {
			top: 24.5%;
			left: 49%;
			width: 79%;
			height: 46%;
			gap: calc(var(--panel-width) * 0.012);
		}

		.card {
			height: 91%;
		}

		.card-content {
			transform: scale(0.8);
			transform-origin: 50% 61%;
		}

		.card .card-desc.card-desc-stacked {
			height: 16%;
		}

		.card .card-desc.card-desc-stacked .desc-spin-count {
			font-size: calc(var(--panel-width) * 0.062);
		}

		.card .card-desc.card-desc-stacked .desc-spin-label {
			font-size: calc(var(--panel-width) * 0.023);
		}

		.card .card-desc.card-desc-stacked .desc-trigger {
			font-size: calc(var(--panel-width) * 0.013);
			min-height: calc(var(--panel-width) * 0.017);
		}

		.card-price-wrap {
			top: 99%;
			height: 18%;
			width: 110%;
		}

		.card-price {
			font-size: calc(var(--panel-width) * 0.033);
		}

		.buy-button {
			top: 113%;
			width: 75%;
			height: 18%;
			font-size: calc(var(--panel-width) * 0.028);
		}

		.bet-adjuster {
			top: 87%;
			left: 49%;
			right: auto;
			width: 72%;
			transform: translateX(-50%);
			height: 6%;
			gap: calc(var(--panel-width) * 0.014);
		}

		.bet-btn {
			width: calc(var(--panel-width) * 0.064);
			height: calc(var(--panel-width) * 0.064);
		}

		.bet-display {
			min-width: calc(var(--panel-width) * 0.18);
		}

		.bet-label {
			font-size: calc(var(--panel-width) * 0.019);
		}

		.bet-value {
			font-size: calc(var(--panel-width) * 0.023);
		}

		.features-section {
			top: 79.2%;
			left: 22%;
			right: 24.5%;
			height: 5.4%;
			padding: 0;
		}

		.features-section :global(.feature-row) {
			height: 100%;
			padding: 0 2.5% 0 2%;
			grid-template-columns: 13% minmax(0, 1fr) auto;
		}

		.features-section :global(.feature-cat-icon) {
			width: calc(var(--panel-width) * 0.04);
			height: calc(var(--panel-width) * 0.04);
		}

		.features-section :global(.feature-info) {
			margin-left: calc(var(--panel-width) * 0.006);
			gap: calc(var(--panel-width) * 0.001);
		}

		.features-section :global(.feature-row .feature-name) {
			font-size: calc(var(--panel-width) * 0.021);
			line-height: 1.08;
		}

		.features-section :global(.feature-cost) {
			font-size: calc(var(--panel-width) * 0.0165);
			line-height: 1.08;
		}

		.features-section :global(.feature-toggle) {
			width: calc(var(--panel-width) * 0.054);
			height: calc(var(--panel-width) * 0.029);
			margin-right: 0;
		}

		.features-section :global(.feature-toggle .knob) {
			width: calc(var(--panel-width) * 0.023);
			height: calc(var(--panel-width) * 0.023);
			top: calc((var(--panel-width) * 0.029 - var(--panel-width) * 0.023) / 2);
			left: calc((var(--panel-width) * 0.029 - var(--panel-width) * 0.023) / 2);
		}

		.features-section :global(.feature-toggle.on .knob) {
			left: calc(
				var(--panel-width) * 0.054 - var(--panel-width) * 0.023 -
					(var(--panel-width) * 0.029 - var(--panel-width) * 0.023) / 2
			);
		}
	}

	@media (max-width: 600px) {
		.buy-bonus-panel:not(.popout-l):not(.popout-s) {
			--panel-width: min(480px, 94vw);
			--panel-height-scale: 1.36;
			height: min(calc(var(--panel-width) * var(--panel-height-scale)), 96vh);
		}
	}

	@media (max-height: 500px) {
		.buy-bonus-panel:not(.popout-l):not(.popout-s):not(.portrait) {
			--panel-width: min(360px, 58vw);
			--panel-height-scale: 1.22;
			height: min(calc(var(--panel-width) * var(--panel-height-scale)), 94vh);
		}
	}
</style>
