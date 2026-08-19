<!--
	BuyBonusOverlay.svelte — меню «Купить функцию» по designer_assets/bg wok menu.png.
	Открывается при stateModal.modal?.name === 'buyBonus'. Масштабируется через
	--panel-width для desktop, portrait, popout L (800×450) и popout S (400×225).
-->
<script lang="ts">
	import { stateModal, stateBet, stateBetDerived, stateConfig, stateI18n } from 'state-shared';
	import { stateBonus } from 'components-ui-html/src/stateBonus.svelte';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { clearActiveFeature } from '../game/activeFeature';
	import {
		buyNormalCostMultiplier,
		buySuperCostMultiplier,
		buyDuelCostMultiplier,
		canAffordBuyBonus,
	} from '../game/buyBonusBalance';
	import {
		isPopoutSmallViewport,
		isPopoutViewport,
		HUD_BALANCE_BET_FONT_FAMILY,
		isLatinScriptLocale,
	} from '../game/constants';
	import { ensureKnewaveFontLoaded } from '../game/knewaveFont';
	import { getContext } from '../game/context';
	import { getContextLayout } from 'utils-layout';
	import { AUTOSPIN_ASSETS, BUY_BONUS_ASSETS, HUD_ASSETS } from '../game/uiHtmlAssetManifest';
	import CashStacksFeatureToggles from './CashStacksFeatureToggles.svelte';
	import FitCardText from './FitCardText.svelte';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const locale = $derived(stateI18n.i18n.locale);
	const useLatinKnewave = $derived(isLatinScriptLocale(locale));
	let knewaveFontReady = $state(false);

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

	$effect(() => {
		let cancelled = false;
		void ensureKnewaveFontLoaded().then(() => {
			if (!cancelled) knewaveFontReady = true;
		});
		return () => {
			cancelled = true;
		};
	});

	const showKnewaveLabels = $derived(useLatinKnewave && knewaveFontReady);

	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);

	type BonusVariant = 'normal' | 'super' | 'duel';

	const normalPrice = $derived(
		numberToCurrencyString(stateBet.betAmount * buyNormalCostMultiplier()),
	);
	const superPrice = $derived(
		numberToCurrencyString(stateBet.betAmount * buySuperCostMultiplier()),
	);
	const duelPrice = $derived(numberToCurrencyString(stateBet.betAmount * buyDuelCostMultiplier()));
	const currentBet = $derived(numberToCurrencyString(stateBet.betAmount));
	const canBuyNormal = $derived(canAffordBuyBonus(buyNormalCostMultiplier()));
	const canBuySuper = $derived(canAffordBuyBonus(buySuperCostMultiplier()));
	const canBuyDuel = $derived(canAffordBuyBonus(buyDuelCostMultiplier()));
	const featureTogglesDisabled = $derived(!context.stateXstateDerived.isIdle());

	const betOptions = $derived([...stateConfig.betAmountOptions].sort((a, b) => a - b));
	const minBet = $derived(
		stateConfig.minBet > 0 ? stateConfig.minBet : betOptions[0],
	);
	const maxBet = $derived(
		stateConfig.maxBet > 0 ? stateConfig.maxBet : betOptions[betOptions.length - 1],
	);
	const canDecrease = $derived(stateBet.betAmount > minBet);
	const canIncrease = $derived(stateBet.betAmount < maxBet);

	const decreaseBet = () => {
		const prev = [...betOptions].reverse().find((opt) => opt < stateBet.betAmount);
		if (prev != null) {
			stateBetDerived.setBetAmount(prev);
			context.eventEmitter.broadcast({ type: 'soundPressMinus' });
		}
	};

	const increaseBet = () => {
		const next = betOptions.find((opt) => opt > stateBet.betAmount);
		if (next != null) {
			stateBetDerived.setBetAmount(next);
			context.eventEmitter.broadcast({ type: 'soundPressPlus' });
		}
	};

	const onBuy = (variant: BonusVariant) => {
		const costMult =
			variant === 'normal'
				? buyNormalCostMultiplier()
				: variant === 'super'
					? buySuperCostMultiplier()
					: buyDuelCostMultiplier();
		if (!canAffordBuyBonus(costMult)) return;
		clearActiveFeature();
		stateBonus.selectedBetModeKey =
			variant === 'normal' ? 'bonus_normal' : variant === 'super' ? 'bonus_super' : 'bonus_duel';
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
	<img class="panel-bg" src={bgUrl} alt="" draggable="false" loading="eager" />

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

		<p class="panel-subtitle" data-test="buy-bonus-title">{context.i18nDerived.buyBonusTitle()}</p>

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
					<div class="card-title" class:card-label-knewave={showKnewaveLabels}>
						{context.i18nDerived.normalBonus()}
					</div>
					<div class="card-desc card-desc-stacked">
						<span class="desc-spin-count" class:card-count-knewave={knewaveFontReady}
							>{context.i18nDerived.buyNormalDescCount()}</span
						>
						<FitCardText
							variant="spin-label"
							text={context.i18nDerived.buyNormalDescSpins()}
							maxLines={2}
						/>
						<FitCardText
							variant="trigger"
							text={context.i18nDerived.buyNormalDescTrigger()}
							maxLines={2}
						/>
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
					<div class="card-title" class:card-label-knewave={showKnewaveLabels}>
						{context.i18nDerived.superBonus()}
					</div>
					<div class="card-desc card-desc-stacked">
						<span class="desc-spin-count" class:card-count-knewave={knewaveFontReady}
							>{context.i18nDerived.buySuperDescCount()}</span
						>
						<FitCardText
							variant="spin-label"
							text={context.i18nDerived.buySuperDescSpins()}
							maxLines={2}
						/>
						<FitCardText
							variant="trigger"
							text={context.i18nDerived.buySuperDescFeature()}
							maxLines={2}
						/>
					</div>
					<div class="card-price-wrap" style:background-image="url('{deskRUrl}')">
						<span class="card-price" data-test="bonus-price-super">{superPrice}</span>
					</div>
					<div class="buy-button" style:background-image="url('{buyButtonBgUrl}')">
						{context.i18nDerived.buyConfirm()}
					</div>
				</div>
			</button>

			<button
				type="button"
				class="card card-duel"
				data-test="bonus-card-duel"
				disabled={!canBuyDuel}
				onclick={() => onBuy('duel')}
			>
				<img class="card-bg" src={normalCardUrl} alt="" draggable="false" />
				<div class="card-content">
					<div class="card-title" class:card-label-knewave={showKnewaveLabels}>
						{context.i18nDerived.duelBonus()}
					</div>
					<div class="card-desc card-desc-stacked">
						<span class="desc-spin-count" class:card-count-knewave={knewaveFontReady}
							>{context.i18nDerived.buyDuelDescCount()}</span
						>
						<FitCardText
							variant="spin-label"
							text={context.i18nDerived.buyDuelDescSpins()}
							maxLines={2}
						/>
						<FitCardText
							variant="trigger"
							text={context.i18nDerived.buyDuelDescFeature()}
							maxLines={2}
						/>
					</div>
					<div class="card-price-wrap" style:background-image="url('{deskLUrl}')">
						<span class="card-price" data-test="bonus-price-duel">{duelPrice}</span>
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
				aria-label={context.i18nDerived.ariaDecreaseAmount()}
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
				aria-label={context.i18nDerived.ariaIncreaseAmount()}
				data-test="bet-increase"
			></button>
		</footer>
	</div>
</div>

<style lang="scss">
	@use './buyBonusPanelDimensions.scss' as *;
	@import url('https://fonts.googleapis.com/css2?family=Philosopher:wght@700&family=Reggae+One&display=swap');

	.buy-bonus-panel {
		// Declarations before mixin: mixin ends with @media nests (mixed-decls).
		--bb-card-price-fs: calc(var(--panel-width) * 0.024);
		--bb-buy-btn-fs: calc(var(--panel-width) * 0.02);
		font-family: v-bind(HUD_BALANCE_BET_FONT_FAMILY);
		position: relative;
		z-index: 10;
		pointer-events: auto;
		filter: drop-shadow(0 16px 42px rgba(0, 0, 0, 0.65));
		@include buy-bonus-panel-dimensions();
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
		font-family: inherit;
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

	.panel-subtitle {
		position: absolute;
		top: 21.5%;
		left: 50%;
		transform: translateX(calc(-50% - var(--panel-width) * 0.01));
		margin: 0;
		width: 72%;
		font-family: inherit;
		font-size: calc(var(--panel-width) * 0.032);
		font-style: italic;
		font-weight: 900;
		text-transform: uppercase;
		color: #d4b44a;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.85),
			0 2px 6px rgba(0, 0, 0, 0.65);
		line-height: 1.1;
		letter-spacing: 0.03em;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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
		gap: calc(var(--panel-width) * 0.01);
		box-sizing: border-box;
	}

	.card {
		position: relative;
		height: 88%;
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
	.card-super,
	.card-duel {
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
		font-family: inherit;
		--bb-card-title-fs: calc(var(--panel-width) * 0.021);
		font-size: var(--bb-card-title-fs);
		font-weight: 900;
		font-style: italic;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		line-height: 1;
		text-align: center;
		color: #f5e6c8;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
	}

	.card-title.card-label-knewave {
		font-family: 'Knewave', sans-serif;
		font-style: normal;
		font-weight: 400;
		letter-spacing: 0;
		paint-order: stroke fill;
		-webkit-font-smoothing: antialiased;
	}

	.card-normal .card-title.card-label-knewave,
	.card-duel .card-title.card-label-knewave,
	.card-super .card-title.card-label-knewave {
		-webkit-text-stroke: calc(var(--bb-card-title-fs) * 0.034) rgba(58, 32, 14, 0.92);
		text-shadow: 0 calc(var(--bb-card-title-fs) * 0.045) calc(var(--bb-card-title-fs) * 0.055)
			rgba(0, 0, 0, 0.55);
	}

	.card .card-desc.card-desc-stacked .desc-spin-count.card-count-knewave {
		font-family: 'Knewave', sans-serif;
		font-style: normal;
		font-weight: 400;
		letter-spacing: 0;
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
		font-family: inherit;
		font-size: calc(var(--panel-width) * 0.0135);
		line-height: 1.15;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.015em;
		text-align: center;
		overflow: visible;
	}

	.card .card-desc.card-desc-stacked {
		top: 58%;
		height: 26%;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		--bb-desc-count-fs: calc(var(--panel-width) * 0.06);
		--bb-desc-count-stroke: calc(var(--bb-desc-count-fs) * 0.092);
		--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.022);
		--bb-desc-spin-label-stroke: calc(var(--bb-desc-spin-label-fs) * 0.092);
		--bb-desc-trigger-fs: calc(var(--panel-width) * 0.013);
		--bb-desc-trigger-stroke: calc(var(--bb-desc-trigger-fs) * 0.092);
		--bb-desc-gap-count-label: calc(var(--bb-desc-count-fs) * 0.12);
		--bb-desc-gap-label-trigger: calc(var(--bb-desc-spin-label-fs) * 0.28);
		--bb-knewave-stroke-weight: 0.034;
		--bb-knewave-count-stroke-weight: 0.072;
		gap: 0;
		text-transform: uppercase;
		font-size: inherit;
		overflow: visible;
	}

	.card .card-desc.card-desc-stacked .desc-spin-count {
		font-size: var(--bb-desc-count-fs);
		font-weight: 900;
		line-height: 0.85;
		letter-spacing: -0.02em;
		flex-shrink: 0;
		margin: 0 0 var(--bb-desc-gap-count-label);
		color: inherit;
		display: inline-block;
		paint-order: stroke fill;
		-webkit-font-smoothing: antialiased;
	}

	.card-normal .card-desc.card-desc-stacked .desc-spin-count,
	.card-duel .card-desc.card-desc-stacked .desc-spin-count {
		-webkit-text-stroke: var(--bb-desc-count-stroke) rgba(255, 244, 225, 0.96);
		text-shadow:
			0 calc(var(--bb-desc-count-fs) * 0.03) 0 rgba(72, 42, 18, 0.62),
			0 calc(var(--bb-desc-count-fs) * 0.055) calc(var(--bb-desc-count-fs) * 0.09)
				rgba(0, 0, 0, 0.38),
			0 0 calc(var(--bb-desc-count-fs) * 0.12) rgba(255, 228, 185, 0.42);
	}

	.card-super .card-desc.card-desc-stacked .desc-spin-count {
		-webkit-text-stroke: var(--bb-desc-count-stroke) rgba(255, 244, 225, 0.96);
		text-shadow:
			0 calc(var(--bb-desc-count-fs) * 0.04) 0 rgba(0, 0, 0, 0.82),
			0 calc(var(--bb-desc-count-fs) * 0.07) calc(var(--bb-desc-count-fs) * 0.1) rgba(0, 0, 0, 0.66),
			0 0 calc(var(--bb-desc-count-fs) * 0.12) rgba(255, 228, 185, 0.38);
	}

	.card-normal .card-desc.card-desc-stacked .desc-spin-count.card-count-knewave,
	.card-duel .card-desc.card-desc-stacked .desc-spin-count.card-count-knewave {
		-webkit-text-stroke: calc(var(--bb-desc-count-fs) * var(--bb-knewave-count-stroke-weight))
			rgba(255, 244, 225, 0.96);
		text-shadow:
			0 calc(var(--bb-desc-count-fs) * 0.03) 0 rgba(72, 42, 18, 0.62),
			0 calc(var(--bb-desc-count-fs) * 0.055) calc(var(--bb-desc-count-fs) * 0.09)
				rgba(0, 0, 0, 0.38);
	}

	.card-super .card-desc.card-desc-stacked .desc-spin-count.card-count-knewave {
		-webkit-text-stroke: calc(var(--bb-desc-count-fs) * var(--bb-knewave-count-stroke-weight))
			rgba(45, 12, 6, 0.94);
		text-shadow:
			0 calc(var(--bb-desc-count-fs) * 0.04) 0 rgba(0, 0, 0, 0.82),
			0 calc(var(--bb-desc-count-fs) * 0.07) calc(var(--bb-desc-count-fs) * 0.1) rgba(0, 0, 0, 0.66);
	}

	.card .card-desc.card-desc-stacked :global(.fit-card-text__inner) {
		color: inherit;
		display: inline-block;
		paint-order: stroke fill;
		-webkit-font-smoothing: antialiased;
	}

	.card-normal .card-desc.card-desc-stacked :global(.fit-card-text__inner.desc-spin-label),
	.card-duel .card-desc.card-desc-stacked :global(.fit-card-text__inner.desc-spin-label) {
		-webkit-text-stroke: var(--bb-desc-spin-label-stroke) rgba(255, 244, 225, 0.96);
		text-shadow:
			0 calc(var(--bb-desc-spin-label-fs) * 0.03) 0 rgba(72, 42, 18, 0.62),
			0 calc(var(--bb-desc-spin-label-fs) * 0.055) calc(var(--bb-desc-spin-label-fs) * 0.09)
				rgba(0, 0, 0, 0.38),
			0 0 calc(var(--bb-desc-spin-label-fs) * 0.12) rgba(255, 228, 185, 0.42);
	}

	.card-normal .card-desc.card-desc-stacked :global(.fit-card-text__inner.desc-trigger),
	.card-duel .card-desc.card-desc-stacked :global(.fit-card-text__inner.desc-trigger) {
		-webkit-text-stroke: var(--bb-desc-trigger-stroke) rgba(255, 244, 225, 0.96);
		text-shadow:
			0 calc(var(--bb-desc-trigger-fs) * 0.03) 0 rgba(72, 42, 18, 0.62),
			0 calc(var(--bb-desc-trigger-fs) * 0.055) calc(var(--bb-desc-trigger-fs) * 0.09)
				rgba(0, 0, 0, 0.38),
			0 0 calc(var(--bb-desc-trigger-fs) * 0.12) rgba(255, 228, 185, 0.42);
	}

	.card-super .card-desc.card-desc-stacked :global(.fit-card-text__inner.desc-spin-label) {
		-webkit-text-stroke: var(--bb-desc-spin-label-stroke) rgba(255, 244, 225, 0.96);
		text-shadow:
			0 calc(var(--bb-desc-spin-label-fs) * 0.04) 0 rgba(0, 0, 0, 0.82),
			0 calc(var(--bb-desc-spin-label-fs) * 0.07) calc(var(--bb-desc-spin-label-fs) * 0.1)
				rgba(0, 0, 0, 0.66),
			0 0 calc(var(--bb-desc-spin-label-fs) * 0.12) rgba(255, 228, 185, 0.38);
	}

	.card-super .card-desc.card-desc-stacked :global(.fit-card-text__inner.desc-trigger) {
		-webkit-text-stroke: var(--bb-desc-trigger-stroke) rgba(255, 244, 225, 0.96);
		text-shadow:
			0 calc(var(--bb-desc-trigger-fs) * 0.04) 0 rgba(0, 0, 0, 0.82),
			0 calc(var(--bb-desc-trigger-fs) * 0.07) calc(var(--bb-desc-trigger-fs) * 0.1)
				rgba(0, 0, 0, 0.66),
			0 0 calc(var(--bb-desc-trigger-fs) * 0.12) rgba(255, 228, 185, 0.38);
	}

	.card-normal
		.card-desc.card-desc-stacked
		:global(.fit-card-text--knewave .fit-card-text__inner.desc-spin-label),
	.card-duel
		.card-desc.card-desc-stacked
		:global(.fit-card-text--knewave .fit-card-text__inner.desc-spin-label) {
		-webkit-text-stroke: calc(var(--bb-desc-spin-label-fs) * var(--bb-knewave-count-stroke-weight))
			rgba(255, 244, 225, 0.96);
		text-shadow:
			0 calc(var(--bb-desc-spin-label-fs) * 0.03) 0 rgba(72, 42, 18, 0.62),
			0 calc(var(--bb-desc-spin-label-fs) * 0.055) calc(var(--bb-desc-spin-label-fs) * 0.09)
				rgba(0, 0, 0, 0.38);
	}

	.card-normal
		.card-desc.card-desc-stacked
		:global(.fit-card-text--knewave .fit-card-text__inner.desc-trigger),
	.card-duel
		.card-desc.card-desc-stacked
		:global(.fit-card-text--knewave .fit-card-text__inner.desc-trigger) {
		-webkit-text-stroke: calc(var(--bb-desc-trigger-fs) * var(--bb-knewave-count-stroke-weight))
			rgba(255, 244, 225, 0.96);
		text-shadow:
			0 calc(var(--bb-desc-trigger-fs) * 0.03) 0 rgba(72, 42, 18, 0.62),
			0 calc(var(--bb-desc-trigger-fs) * 0.055) calc(var(--bb-desc-trigger-fs) * 0.09)
				rgba(0, 0, 0, 0.38);
	}

	.card-super
		.card-desc.card-desc-stacked
		:global(.fit-card-text--knewave .fit-card-text__inner.desc-spin-label) {
		-webkit-text-stroke: calc(var(--bb-desc-spin-label-fs) * var(--bb-knewave-count-stroke-weight))
			rgba(45, 12, 6, 0.94);
		text-shadow:
			0 calc(var(--bb-desc-spin-label-fs) * 0.04) 0 rgba(0, 0, 0, 0.82),
			0 calc(var(--bb-desc-spin-label-fs) * 0.07) calc(var(--bb-desc-spin-label-fs) * 0.1)
				rgba(0, 0, 0, 0.66);
	}

	.card-super
		.card-desc.card-desc-stacked
		:global(.fit-card-text--knewave .fit-card-text__inner.desc-trigger) {
		-webkit-text-stroke: calc(var(--bb-desc-trigger-fs) * var(--bb-knewave-count-stroke-weight))
			rgba(45, 12, 6, 0.94);
		text-shadow:
			0 calc(var(--bb-desc-trigger-fs) * 0.04) 0 rgba(0, 0, 0, 0.82),
			0 calc(var(--bb-desc-trigger-fs) * 0.07) calc(var(--bb-desc-trigger-fs) * 0.1)
				rgba(0, 0, 0, 0.66);
	}

	.card .card-desc.card-desc-stacked :global(.fit-card-text--spin-label) {
		margin: 0 0 var(--bb-desc-gap-label-trigger);
	}

	.card-normal .card-desc,
	.card-duel .card-desc {
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
		font-family: inherit;
		font-size: var(--bb-card-price-fs);
		font-weight: 900;
		letter-spacing: 0.01em;
		text-align: center;
		line-height: 1;
	}

	.card-normal .card-price,
	.card-duel .card-price {
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
		font-family: inherit;
		font-size: var(--bb-buy-btn-fs);
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
		font-family: inherit;
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
		font-family: inherit;
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
		font-family: inherit;
		font-size: calc(var(--panel-width) * 0.026);
		font-weight: 800;
		line-height: 1;
		color: #d4b44a;
		letter-spacing: 0.08em;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.75);
	}

	.bet-value {
		font-family: inherit;
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

		--bb-card-price-fs: calc(var(--panel-width) * 0.028);
		--bb-buy-btn-fs: calc(var(--panel-width) * 0.021);

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

		.card-super .card-desc.card-desc-stacked {
			--bb-desc-count-fs: calc(var(--panel-width) * 0.072);
			--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.028);
			--bb-desc-trigger-fs: calc(var(--panel-width) * 0.018);
		}

		.card-normal .card-desc.card-desc-stacked,
		.card-duel .card-desc.card-desc-stacked {
			--bb-desc-count-fs: calc(var(--panel-width) * 0.072);
			--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.028);
			--bb-desc-trigger-fs: calc(var(--panel-width) * 0.018);
		}

		.card-price-wrap {
			top: 99%;
			height: 18%;
			width: 110%;
		}

		.buy-button {
			top: 112%;
			width: 68%;
			height: 18%;
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

		.panel-subtitle {
			font-size: calc(var(--panel-width) * 0.026);
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
		--bb-card-price-fs: calc(var(--panel-width) * 0.036);
		--bb-buy-btn-fs: calc(var(--panel-width) * 0.032);

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
			height: 24%;
			--bb-desc-count-fs: calc(var(--panel-width) * 0.094);
			--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.037);
			--bb-desc-trigger-fs: calc(var(--panel-width) * 0.021);
		}

		.card-price-wrap {
			top: 105%;
			height: 18%;
			width: 118%;
		}

		.buy-button {
			top: 120%;
			width: 76%;
			height: 19%;
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

		.panel-subtitle {
			font-size: calc(var(--panel-width) * 0.036);
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

	/* Stake popout L — 800×450 (laptop embed) */
	.buy-bonus-panel.popout-l {
		filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.6));
		--bb-card-price-fs: calc(var(--panel-width) * 0.028);
		--bb-buy-btn-fs: calc(var(--panel-width) * 0.024);

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
			height: 18%;
			--bb-desc-count-fs: calc(var(--panel-width) * 0.072);
			--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.027);
			--bb-desc-trigger-fs: calc(var(--panel-width) * 0.016);
		}

		.card-price-wrap {
			top: 99%;
			height: 18%;
			width: 110%;
		}

		.buy-button {
			top: 113%;
			width: 75%;
			height: 18%;
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

		.panel-subtitle {
			font-size: calc(var(--panel-width) * 0.026);
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
		filter: drop-shadow(
			0 calc(var(--panel-width) * 0.025) calc(var(--panel-width) * 0.075) rgba(0, 0, 0, 0.55)
		);
		--bb-card-price-fs: calc(var(--panel-width) * 0.028);
		--bb-buy-btn-fs: calc(var(--panel-width) * 0.024);

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
			height: 18%;
			--bb-desc-count-fs: calc(var(--panel-width) * 0.062);
			--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.023);
			--bb-desc-trigger-fs: calc(var(--panel-width) * 0.013);
		}

		.card-price-wrap {
			top: 99%;
			height: 18%;
			width: 110%;
		}

		.buy-button {
			top: 113%;
			width: 75%;
			height: 18%;
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

		.panel-subtitle {
			font-size: calc(var(--panel-width) * 0.026);
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

	/* Laptop 1024×576 */
	@media (max-width: 1024px) and (min-width: 601px) {
		.buy-bonus-panel:not(.popout-l):not(.popout-s):not(.portrait) {
			.card-super .card-desc.card-desc-stacked {
				--bb-desc-count-fs: calc(var(--panel-width) * 0.07);
				--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.027);
				--bb-desc-trigger-fs: calc(var(--panel-width) * 0.017);
			}

			.card-normal .card-desc.card-desc-stacked,
			.card-duel .card-desc.card-desc-stacked {
				--bb-desc-count-fs: calc(var(--panel-width) * 0.07);
				--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.027);
				--bb-desc-trigger-fs: calc(var(--panel-width) * 0.017);
			}
		}
	}
</style>
