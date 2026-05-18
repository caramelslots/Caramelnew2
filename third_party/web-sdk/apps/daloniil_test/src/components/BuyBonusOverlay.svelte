<!--
	BuyBonusOverlay.svelte — кастомное меню «Купить функцию» для Cash Stacks.
	Содержит 2 карточки бонусов которые можно купить:
	  - NORMAL BONUS (×100): 10 FS, гарантированный триггер бонуса
	  - SUPER BONUS (×200): 10 FS, старт с ×3 Sticky Mystery Reels

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
	import { getContext } from '../game/context';
	import AssetPlaceholder from './AssetPlaceholder.svelte';
	import CashStacksFeatureToggles from './CashStacksFeatureToggles.svelte';

	const context = getContext();

	const isOpen = $derived(stateModal.modal?.name === 'buyBonus');

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
		<div class="buy-bonus-wrap" data-test="buy-bonus-overlay">
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
				<div class="card" data-test="bonus-card-normal">
					<div class="card-title">{context.i18nDerived.normalBonus()}</div>
					<div class="icon-wrap">
						<AssetPlaceholder label="BONUS" variant="bonus" width={110} height={110} />
					</div>
					<div class="card-desc">{context.i18nDerived.buyNormalDesc()}</div>
					<div class="card-price" data-test="bonus-price-normal">{normalPrice}</div>
					<button class="buy-button" onclick={() => onBuy('normal')}>
						{context.i18nDerived.buyConfirm()}
					</button>
				</div>

				<!-- SUPER BONUS -->
				<div class="card" data-test="bonus-card-super">
					<div class="card-title">{context.i18nDerived.superBonus()}</div>
					<div class="icon-wrap">
						<AssetPlaceholder label="SUPER" variant="super" width={110} height={110} />
					</div>
					<div class="card-desc">{context.i18nDerived.buySuperDesc()}</div>
					<div class="card-price" data-test="bonus-price-super">{superPrice}</div>
					<button class="buy-button" onclick={() => onBuy('super')}>
						{context.i18nDerived.buyConfirm()}
					</button>
				</div>
			</div>

			<section class="feature-toggles" aria-label="features">
				<CashStacksFeatureToggles />
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
	/*
		Главный контейнер — голубой темный фон, скруглённые углы, заголовок
		сверху + красный X справа, ниже сетка карточек, внизу bet-adjuster.
		z-index: 10 поднимает контент НАД click-to-close-layer внутри Popup
		(там z-index: 2), иначе клики на кнопки уходят в click-to-close и
		модалка просто закрывается.
	*/
	.buy-bonus-wrap {
		position: relative;
		z-index: 10;
		width: min(820px, 92vw);
		padding: 1.2rem 1.4rem 1.2rem;
		background: linear-gradient(180deg, #14233a 0%, #0a1628 100%);
		border-radius: 18px;
		border: 1px solid rgba(255, 255, 255, 0.06);
		color: #fff;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		font-family: 'proxima-nova', sans-serif;
	}

	.header {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 2.4rem;
	}

	.title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: 0.03em;
	}

	.close-btn {
		position: absolute;
		right: 0;
		top: 0;
		width: 36px;
		height: 36px;
		border-radius: 9px;
		border: 0;
		background: #d32f2f;
		color: #fff;
		font-size: 1.5rem;
		font-weight: 800;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
		transition: filter 0.1s, transform 0.05s;

		&:hover { filter: brightness(1.1); }
		&:active { transform: translateY(1px); }
	}

	.cards {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.feature-toggles {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	@media (max-width: 600px) {
		.cards { grid-template-columns: 1fr; }
	}

	/*
		Карточка бонуса — голубой плоский тон с скруглёнными углами.
		Внутри: тайтл, иконка, описание, цена, BUY-кнопка.
	*/
	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.55rem;
		padding: 1rem 0.9rem 1.1rem;
		background: linear-gradient(180deg, #4a8bbb 0%, #3a6f95 100%);
		border-radius: 12px;
		text-align: center;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.28);
	}

	.card-title {
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		color: #ffd96b;
		text-transform: uppercase;
		min-height: 2.6em;
		display: flex;
		align-items: center;
	}

	.icon-wrap {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 110px;
	}

	.card-desc {
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.95);
		line-height: 1.35;
		min-height: 2.7em;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	/* Цена — крупная, белая, акцент на сумме. */
	.card-price {
		font-size: 1.45rem;
		font-weight: 900;
		color: #ffffff;
		letter-spacing: 0.01em;
	}

	.buy-button {
		margin-top: 0.4rem;
		padding: 0.55rem 2rem;
		font-size: 0.95rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		border: 0;
		border-radius: 9px;
		cursor: pointer;
		text-transform: uppercase;
		transition: transform 0.1s, filter 0.15s;
		color: #2b1f08;
		background: linear-gradient(180deg, #ffd96b 0%, #d6a233 100%);
		box-shadow: 0 3px 0 rgba(0, 0, 0, 0.22);
		min-width: 140px;

		&:hover { filter: brightness(1.08); }
		&:active { transform: translateY(1px); }
	}

	/*
		Нижняя строка с +/- и текущей ставкой. Тёмная полоса как на референсе.
	*/
	.bet-adjuster {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 0.7rem 1rem;
		background: rgba(0, 0, 0, 0.45);
		border-radius: 12px;
	}

	.bet-btn {
		width: 50px;
		height: 38px;
		border-radius: 9px;
		border: 0;
		background: linear-gradient(180deg, #4a8bbb 0%, #3a6f95 100%);
		color: #fff;
		font-size: 1.4rem;
		font-weight: 800;
		line-height: 1;
		cursor: pointer;
		transition: filter 0.1s, transform 0.05s;

		&:disabled { opacity: 0.45; cursor: not-allowed; }
		&:not(:disabled):hover { filter: brightness(1.1); }
		&:not(:disabled):active { transform: translateY(1px); }
	}

	.bet-display {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		min-width: 160px;
		justify-content: center;
	}

	.bet-label {
		font-size: 0.85rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.75);
		letter-spacing: 0.06em;
	}

	.bet-value {
		font-size: 1.1rem;
		font-weight: 800;
		color: #fff;
	}
</style>
