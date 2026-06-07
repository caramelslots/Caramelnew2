<!--
	BuyBonusOverlay.svelte — кастомное меню «Купить функцию» для Cash Stacks.
	Содержит 2 карточки бонусов в ряд (всегда 2 колонки) + адаптив
	portrait / popout S-L / desktop.

	Пользователь видит цену в РЕАЛЬНЫХ деньгах = bet × множитель. Внизу
	панели — компактный контрол изменения ставки (- ставка $X +) который
	работает поверх stateConfig.betAmountOptions (тот же набор что у
	главного +/- в HUD).

	Рендерится поверх стандартного ModalBuyBonus (zIndex 60 > zIndex.modal=50).
	На BUY → emit buyBonusConfirm → стандартный ModalBuyBonusConfirm подхватывает.
-->
<script lang="ts">
	import { Popup } from 'components-shared';
	import { stateModal, stateBet, stateBetDerived, stateConfig } from 'state-shared';
	import { stateBonus } from 'components-ui-html/src/stateBonus.svelte';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { clearActiveFeature } from '../game/activeFeature';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';
	import { getContext } from '../game/context';
	import { getContextLayout } from 'utils-layout';
	import AssetPlaceholder from './AssetPlaceholder.svelte';
	import CashStacksFeatureToggles from './CashStacksFeatureToggles.svelte';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const isOpen = $derived(stateModal.modal?.name === 'buyBonus');
	const featureTogglesDisabled = $derived(!context.stateXstateDerived.isIdle());
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPortrait = $derived(layoutType === 'portrait');
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);

	const iconSize = $derived(
		isPopoutSmall ? 44 : isPortrait ? 58 : isPopout ? 52 : 64,
	);

	type BonusVariant = 'normal' | 'super';

	// Множители из BUY_NORMAL_COST/BUY_SUPER_COST i18n. Держим в TS как
	// number чтобы умножать на текущий bet и показывать живую цену.
	const NORMAL_MULT = 100;
	const SUPER_MULT = 200;

	const normalPrice = $derived(numberToCurrencyString(stateBet.betAmount * NORMAL_MULT));
	const superPrice = $derived(numberToCurrencyString(stateBet.betAmount * SUPER_MULT));
	const currentBet = $derived(numberToCurrencyString(stateBet.betAmount));

	// === Bet adjuster ===
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
		clearActiveFeature();
		/*
			НЕ трогаем stateBet.activeBetModeKey здесь — иначе HUD сразу же
			пересчитает betCost под bonus-цены, а до подтверждения это
			преждевременно. Запоминаем выбор в stateBonus.selectedBetModeKey
			(тот же канал, который читает SDK ModalBuyBonusConfirm) и
			финальный set activeBetModeKey делает BuyBonusConfirmOverlay при
			нажатии КУПИТЬ.
		*/
		stateBonus.selectedBetModeKey = variant === 'normal' ? 'bonus_normal' : 'bonus_super';
		stateModal.modal = null;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		context.eventEmitter.broadcast({ type: 'buyBonusConfirm' });
	};

	const close = () => {
		stateModal.modal = null;
	};
</script>

{#if isOpen}
	<!--
		persistent: дефолтный click-to-close слой Popup'а перекрывает контент
		через z-index: 2 и съедает клики по +/- и КУПИТЬ. Также скрывает
		SDK-шный крестик X (у нас собственный в header). Закрытие — только
		через нашу красную X кнопку.
	-->
	<Popup zIndex={60} persistent onclose={close}>
		<div
			class="buy-bonus-wrap"
			class:portrait={isPortrait}
			class:popout-l={isPopout}
			class:popout-s={isPopoutSmall}
			data-test="buy-bonus-overlay"
		>
			<header class="header">
				<h2 class="title">{context.i18nDerived.buyBonusTitle()}</h2>
				<button
					type="button"
					class="close-btn"
					onclick={close}
					aria-label="close"
					data-test="buy-bonus-close"
				>
					×
				</button>
			</header>

			<div class="cards">
				<!-- NORMAL BONUS -->
				<article class="bonus-card" data-test="bonus-card-normal">
					<h3 class="bonus-card-title">{context.i18nDerived.normalBonus()}</h3>
					<div class="bonus-card-icon">
						<AssetPlaceholder label="BONUS" variant="bonus" width={iconSize} height={iconSize} />
					</div>
					<p class="bonus-card-desc">{context.i18nDerived.buyNormalDesc()}</p>
					<div class="bonus-card-price" data-test="bonus-price-normal">{normalPrice}</div>
					<button type="button" class="bonus-card-btn buy" onclick={() => onBuy('normal')}>
						{context.i18nDerived.buyConfirm()}
					</button>
				</article>

				<!-- SUPER BONUS -->
				<article class="bonus-card bonus-card-super" data-test="bonus-card-super">
					<h3 class="bonus-card-title">{context.i18nDerived.superBonus()}</h3>
					<div class="bonus-card-icon">
						<AssetPlaceholder label="SUPER" variant="super" width={iconSize} height={iconSize} />
					</div>
					<p class="bonus-card-desc">{context.i18nDerived.buySuperDesc()}</p>
					<div class="bonus-card-price" data-test="bonus-price-super">{superPrice}</div>
					<button type="button" class="bonus-card-btn buy" onclick={() => onBuy('super')}>
						{context.i18nDerived.buyConfirm()}
					</button>
				</article>
			</div>

			<section class="feature-toggles" aria-label="features">
				<CashStacksFeatureToggles
					features={['bonus_boost']}
					disabled={featureTogglesDisabled}
					noHoverBg
				/>
			</section>

			<!-- BET ADJUSTER — фиксированная нижняя строка с минусом/плюсом и текущим бетом. -->
			<footer class="bet-adjuster">
				<button
					type="button"
					class="bet-btn"
					onclick={decreaseBet}
					disabled={!canDecrease}
					aria-label="decrease bet"
					data-test="bet-decrease"
				>
					−
				</button>
				<div class="bet-display">
					<span class="bet-label">{context.i18nDerived.bet().toUpperCase()}</span>
					<span class="bet-value" data-test="bet-value">{currentBet}</span>
				</div>
				<button
					type="button"
					class="bet-btn"
					onclick={increaseBet}
					disabled={!canIncrease}
					aria-label="increase bet"
					data-test="bet-increase"
				>
					+
				</button>
			</footer>
		</div>
	</Popup>
{/if}

<style lang="scss">
	$modal-bg: #0a1524;
	$card-bg: #58a9cc;
	$card-bg-super: #5f9fd4;
	$card-border: #101010;
	$title-gold: #ffe566;
	$title-cyan: #9ef0ff;

	.buy-bonus-wrap {
		position: relative;
		z-index: 10;
		width: min(520px, 96vw);
		max-height: min(92vh, 820px);
		overflow-y: auto;
		padding: 0.85rem 0.9rem 0.8rem;
		background: linear-gradient(180deg, #12243c 0%, $modal-bg 100%);
		border-radius: 16px;
		border: 2px solid rgba(0, 0, 0, 0.65);
		color: #fff;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		font-family: 'proxima-nova', sans-serif;
		box-shadow:
			0 14px 36px rgba(0, 0, 0, 0.55),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
	}

	.header {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 2rem;
		flex-shrink: 0;
		padding-bottom: 0.15rem;
	}

	.title {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-align: center;
		padding: 0 2rem;
		text-transform: uppercase;
	}

	.close-btn {
		position: absolute;
		right: 0;
		top: 0;
		width: 30px;
		height: 30px;
		border-radius: 7px;
		border: 2px solid #101010;
		background: #d32f2f;
		color: #fff;
		font-size: 1.25rem;
		font-weight: 800;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
		transition: filter 0.1s, transform 0.05s;

		&:hover { filter: brightness(1.1); }
		&:active { transform: translateY(1px); }
	}

	.cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.55rem;
	}

	.bonus-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.28rem;
		min-width: 0;
		min-height: 0;
		padding: 0.45rem 0.4rem 0.5rem;
		background: $card-bg;
		border: 2px solid $card-border;
		border-radius: 12px;
		text-align: center;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.22),
			0 4px 0 rgba(0, 0, 0, 0.28);
	}

	.bonus-card-super {
		background: $card-bg-super;
	}

	.bonus-card-title {
		margin: 0;
		width: 100%;
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.03em;
		color: $title-gold;
		text-transform: uppercase;
		line-height: 1.1;
		text-shadow:
			1px 1px 0 rgba(0, 0, 0, 0.85),
			-1px -1px 0 rgba(0, 0, 0, 0.55);
	}

	.bonus-card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin: 0.05rem 0;
	}

	.bonus-card-desc {
		margin: 0;
		width: 100%;
		font-size: 0.46rem;
		color: rgba(255, 255, 255, 0.96);
		line-height: 1.25;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.bonus-card-price {
		margin-top: 0.05rem;
		font-size: 0.95rem;
		font-weight: 900;
		color: #ffffff;
		letter-spacing: 0.01em;
		line-height: 1;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
	}

	.bonus-card-btn {
		margin-top: 0.2rem;
		width: 100%;
		padding: 0.34rem 0.35rem;
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		border: 2px solid $card-border;
		border-radius: 8px;
		cursor: pointer;
		text-transform: uppercase;
		transition: transform 0.1s, filter 0.15s;
		box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);

		&.buy {
			color: #2b1f08;
			background: linear-gradient(180deg, #ffe14d 0%, #e5a820 100%);
		}

		&:hover:not(:disabled) { filter: brightness(1.06); }
		&:active:not(:disabled) { transform: translateY(1px); }

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
			pointer-events: none;
		}
	}

	.feature-toggles {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.55rem;
		flex-shrink: 0;
	}

	.feature-toggles :global(.feature-row) {
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: 0.25rem;
		padding: 0.45rem 0.4rem 0.5rem;
		background: $card-bg;
		border: 2px solid $card-border;
		border-radius: 12px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.22),
			0 4px 0 rgba(0, 0, 0, 0.28);
		text-align: center;
		transition: transform 0.05s, filter 0.1s;

		&:active:not(:disabled) {
			transform: translateY(1px);
			filter: brightness(0.98);
		}

		&:disabled {
			opacity: 0.45;
		}
	}

	.feature-toggles :global(.feature-row.compact .feature-name),
	.feature-toggles :global(.feature-row:not(.panel-bg) .feature-name) {
		width: 100%;
		font-size: 0.58rem;
		font-weight: 800;
		line-height: 1.1;
		text-transform: uppercase;
		color: $title-cyan;
		text-shadow:
			1px 1px 0 rgba(0, 0, 0, 0.85),
			-1px -1px 0 rgba(0, 0, 0, 0.55);
	}

	.feature-toggles :global(.feature-row:not(.panel-bg) .feature-cost) {
		font-size: 0.72rem;
		font-weight: 800;
		color: #fff;
		line-height: 1;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
	}

	.feature-toggles :global(.feature-info) {
		align-items: center;
		width: 100%;
		gap: 0.12rem;
	}

	.feature-toggles :global(.feature-toggle) {
		margin-top: 0.15rem;
		width: 34px;
		height: 18px;
		border: 2px solid $card-border;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
	}

	.feature-toggles :global(.feature-toggle .knob) {
		width: 12px;
		height: 12px;
		top: 1px;
		left: 1px;
		border: 1px solid rgba(0, 0, 0, 0.35);
	}

	.feature-toggles :global(.feature-toggle.on .knob) {
		left: 17px;
	}

	.bet-adjuster {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.65rem;
		padding: 0.5rem 0.65rem;
		background: rgba(0, 0, 0, 0.55);
		border: 2px solid rgba(0, 0, 0, 0.45);
		border-radius: 10px;
		flex-shrink: 0;
	}

	.bet-btn {
		width: 40px;
		height: 32px;
		border-radius: 8px;
		border: 2px solid $card-border;
		background: linear-gradient(180deg, #58a9cc 0%, #3f86a8 100%);
		color: #fff;
		font-size: 1.15rem;
		font-weight: 800;
		line-height: 1;
		cursor: pointer;
		transition: filter 0.1s, transform 0.05s;
		box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3);

		&:disabled { opacity: 0.45; cursor: not-allowed; }
		&:not(:disabled):hover { filter: brightness(1.08); }
		&:not(:disabled):active { transform: translateY(1px); }
	}

	.bet-display {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		min-width: 0;
		justify-content: center;
	}

	.bet-label {
		font-size: 0.68rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.72);
		letter-spacing: 0.05em;
	}

	.bet-value {
		font-size: 0.88rem;
		font-weight: 800;
		color: #fff;
	}

	.buy-bonus-wrap.popout-l {
		width: min(460px, 96vw);
		padding: 0.65rem 0.7rem 0.6rem;
		gap: 0.5rem;

		.title { font-size: 0.95rem; }
		.cards,
		.feature-toggles { gap: 0.45rem; }
	}

	.buy-bonus-wrap.popout-s {
		width: min(340px, 98vw);
		padding: 0.45rem 0.5rem 0.4rem;
		gap: 0.35rem;
		border-radius: 12px;

		.title {
			font-size: 0.72rem;
			padding: 0 1.4rem;
		}

		.close-btn {
			width: 22px;
			height: 22px;
			font-size: 0.95rem;
			border-radius: 5px;
		}

		.cards,
		.feature-toggles { gap: 0.3rem; }

		.bonus-card {
			padding: 0.32rem 0.28rem 0.36rem;
			gap: 0.16rem;
			border-radius: 9px;
		}

		.bonus-card-title { font-size: 0.48rem; }
		.bonus-card-desc { font-size: 0.38rem; }
		.bonus-card-price { font-size: 0.72rem; }

		.bonus-card-btn {
			padding: 0.24rem 0.2rem;
			font-size: 0.46rem;
			border-radius: 6px;
		}

		.feature-toggles :global(.feature-row) {
			padding: 0.32rem 0.28rem 0.36rem;
			border-radius: 9px;
		}

		.feature-toggles :global(.feature-row:not(.panel-bg) .feature-name) {
			font-size: 0.46rem;
		}

		.feature-toggles :global(.feature-row:not(.panel-bg) .feature-cost) {
			font-size: 0.58rem;
		}

		.feature-toggles :global(.feature-toggle) {
			width: 26px;
			height: 14px;
		}

		.feature-toggles :global(.feature-toggle .knob) {
			width: 8px;
			height: 8px;
		}

		.feature-toggles :global(.feature-toggle.on .knob) {
			left: 12px;
		}

		.bet-adjuster {
			gap: 0.3rem;
			padding: 0.32rem 0.38rem;
		}

		.bet-btn {
			width: 28px;
			height: 22px;
			font-size: 0.85rem;
		}

		.bet-label { font-size: 0.5rem; }
		.bet-value { font-size: 0.62rem; }
	}

	.buy-bonus-wrap.portrait {
		width: min(480px, 96vw);
		padding: 0.75rem 0.8rem 0.7rem;
		gap: 0.55rem;

		.title { font-size: 1rem; }
	}
</style>
