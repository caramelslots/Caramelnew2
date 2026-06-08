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
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';
	import { getContext } from '../game/context';
	import { getContextLayout } from 'utils-layout';
	import AssetPlaceholder from './AssetPlaceholder.svelte';
	import CashStacksFeatureToggles from './CashStacksFeatureToggles.svelte';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const isOpen = $derived(stateModal.modal?.name === 'buyBonus');
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);
	const iconSize = $derived(isPopoutSmall ? 42 : isPopout ? 58 : 110);

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
				<div class="card" data-test="bonus-card-normal">
					<div class="card-title">{context.i18nDerived.normalBonus()}</div>
					<div class="icon-wrap">
						<AssetPlaceholder label="BONUS" variant="bonus" width={iconSize} height={iconSize} />
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
						<AssetPlaceholder label="SUPER" variant="super" width={iconSize} height={iconSize} />
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
		align-items: stretch;
	}

	.feature-toggles {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
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
		min-width: 0;
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

	.icon-wrap :global(.asset-placeholder) {
		width: 110px !important;
		height: 110px !important;
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
		margin-top: auto;
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

		&:hover:not(:disabled) { filter: brightness(1.08); }
		&:active:not(:disabled) { transform: translateY(1px); }

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
			pointer-events: none;
		}
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

	/* Узкие экраны (не popout): карточки в ряд, уменьшаем размеры. */
	@media (max-width: 600px) {
		.buy-bonus-wrap:not(.popout-l):not(.popout-s) {
			padding: 0.85rem 0.75rem;
			gap: 0.75rem;
		}

		.title { font-size: 1.15rem; }

		.cards { gap: 0.55rem; }

		.card {
			padding: 0.65rem 0.45rem 0.75rem;
			gap: 0.35rem;
			border-radius: 10px;
		}

		.card-title {
			font-size: 0.72rem;
			min-height: 2.4em;
		}

		.icon-wrap {
			min-height: 64px;
		}

		.icon-wrap :global(.asset-placeholder) {
			width: 64px !important;
			height: 64px !important;
		}

		.card-desc {
			font-size: 0.52rem;
			min-height: 2.5em;
			letter-spacing: 0.02em;
		}

		.card-price { font-size: 0.95rem; }

		.buy-button {
			min-width: 0;
			width: 100%;
			padding: 0.4rem 0.5rem;
			font-size: 0.72rem;
			border-radius: 7px;
		}

		.bet-adjuster {
			gap: 0.6rem;
			padding: 0.55rem 0.65rem;
		}

		.bet-btn {
			width: 40px;
			height: 32px;
			font-size: 1.1rem;
		}

		.bet-display { min-width: 120px; }
		.bet-label { font-size: 0.72rem; }
		.bet-value { font-size: 0.9rem; }
	}

	/*
		Portrait mobile — только пропорции, без смены визуального стиля.
		X в потоке header (не в углу блока), чтобы не вылезал за скругление.
	*/
	.buy-bonus-wrap.portrait:not(.popout-l):not(.popout-s) {
		width: min(360px, 86vw);
		padding: 1rem 0.85rem 1.05rem;
		gap: 0.9rem;

		.header {
			display: grid;
			grid-template-columns: 20px 1fr 20px;
			align-items: center;
			column-gap: 0.3rem;
			min-height: 1.25rem;
		}

		.title {
			grid-column: 1 / -1;
			grid-row: 1;
			padding: 0;
			text-align: center;
		}

		.close-btn {
			position: relative;
			z-index: 1;
			grid-column: 3;
			grid-row: 1;
			justify-self: end;
			align-self: center;
			width: 20px;
			height: 20px;
			font-size: 0.78rem;
			border-radius: 5px;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
		}

		.cards {
			grid-template-columns: 1fr 1fr;
			gap: 0.5rem;
		}

		.card {
			padding: 0.8rem 0.4rem 0.9rem;
			gap: 0.5rem;
		}

		.card-title {
			font-size: 0.72rem;
			min-height: 2.4em;
		}

		.icon-wrap {
			min-height: 76px;
		}

		.icon-wrap :global(.asset-placeholder) {
			width: 68px !important;
			height: 68px !important;
		}

		.card-desc {
			font-size: 0.58rem;
			line-height: 1.35;
			min-height: 2.6em;
		}

		.card-price {
			font-size: 1rem;
		}

		.buy-button {
			padding: 0.5rem 0.35rem;
			font-size: 0.74rem;
		}

		.feature-toggles :global(.feature-row) {
			padding: 0.6rem 0.45rem;
		}

		.bet-adjuster {
			gap: 0.8rem;
			padding: 0.6rem 0.7rem;
		}

		.bet-display {
			flex-direction: column;
			align-items: center;
			gap: 0.05rem;
			min-width: 88px;
		}

		.bet-label {
			font-size: 0.88rem;
			font-weight: 800;
			color: rgba(255, 255, 255, 0.88);
			letter-spacing: 0.08em;
		}

		.bet-value {
			font-size: 1.25rem;
			font-weight: 900;
		}
	}

	/* Stake popout L — embed 800×450 */
	.buy-bonus-wrap.popout-l {
		width: min(620px, 86vw);
		max-height: 94vh;
		overflow-y: auto;
		padding: 0.8rem 0.65rem 0.85rem;
		gap: 0.62rem;
		border-radius: 14px;

		.header { min-height: 2rem; }
		.title { font-size: 1rem; }

		.close-btn {
			width: 28px;
			height: 28px;
			font-size: 1.1rem;
			border-radius: 7px;
		}

		.cards { gap: 0.5rem; }

		.card {
			padding: 0.7rem 0.38rem 0.75rem;
			gap: 0.38rem;
			border-radius: 10px;
		}

		.card-title {
			font-size: 0.78rem;
			min-height: 2.2em;
		}

		.icon-wrap { min-height: 58px; }

		.icon-wrap :global(.asset-placeholder) {
			width: 58px !important;
			height: 58px !important;
		}

		.icon-wrap :global(.label) {
			font-size: 0.42rem;
			padding: 0.1em;
			word-break: keep-all;
		}

		.card-desc {
			font-size: 0.58rem;
			min-height: 2.5em;
			letter-spacing: 0.02em;
		}

		.card-price { font-size: 0.95rem; }

		.buy-button {
			min-width: 0;
			width: 100%;
			padding: 0.45rem 0.4rem;
			font-size: 0.72rem;
			border-radius: 7px;
		}

		.feature-toggles :global(.feature-row) {
			padding: 0.5rem 0.45rem;
			border-radius: 8px;
		}

		.feature-toggles :global(.feature-name) { font-size: 0.72rem; }
		.feature-toggles :global(.feature-cost) { font-size: 0.58rem; }

		.feature-toggles :global(.feature-toggle) {
			width: 32px;
			height: 18px;
		}

		.feature-toggles :global(.knob) {
			width: 14px;
			height: 14px;
		}

		.feature-toggles :global(.feature-toggle.on .knob) {
			left: 15px;
		}

		.bet-adjuster {
			gap: 0.55rem;
			padding: 0.52rem 0.5rem;
			border-radius: 9px;
		}

		.bet-btn {
			width: 38px;
			height: 30px;
			font-size: 1rem;
		}

		.bet-display { min-width: 110px; }
		.bet-label { font-size: 0.68rem; }
		.bet-value { font-size: 0.82rem; }
	}

	/* Stake popout S — embed 400×225 */
	.buy-bonus-wrap.popout-s {
		width: min(360px, 90vw);
		max-height: 96vh;
		overflow-y: auto;
		padding: 0.48rem 0.38rem 0.52rem;
		gap: 0.38rem;
		border-radius: 10px;

		.header {
			display: grid;
			grid-template-columns: 16px 1fr 16px;
			align-items: center;
			column-gap: 0.2rem;
			min-height: 1rem;
		}

		.title {
			grid-column: 1 / -1;
			grid-row: 1;
			font-size: 0.62rem;
			padding: 0;
			text-align: center;
		}

		.close-btn {
			position: relative;
			z-index: 1;
			grid-column: 3;
			grid-row: 1;
			justify-self: end;
			align-self: center;
			width: 16px;
			height: 16px;
			font-size: 0.65rem;
			border-radius: 4px;
			box-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
		}

		.cards { gap: 0.22rem; }

		.card {
			padding: 0.4rem 0.16rem 0.44rem;
			gap: 0.22rem;
			border-radius: 7px;
			box-shadow: 0 3px 8px rgba(0, 0, 0, 0.28);
		}

		.card-title {
			font-size: 0.42rem;
			min-height: 1.9em;
			letter-spacing: 0.03em;
		}

		.icon-wrap { min-height: 48px; }

		.icon-wrap :global(.asset-placeholder) {
			width: 46px !important;
			height: 46px !important;
			border-width: 1px;
		}

		.icon-wrap :global(.label) {
			font-size: 0.32rem;
			padding: 0.05em;
			letter-spacing: 0;
			word-break: keep-all;
			line-height: 1;
		}

		.card-desc {
			font-size: 0.32rem;
			min-height: 2.5em;
			line-height: 1.25;
			letter-spacing: 0.01em;
		}

		.card-price { font-size: 0.62rem; }

		.buy-button {
			min-width: 0;
			width: 100%;
			padding: 0.32rem 0.18rem;
			font-size: 0.4rem;
			border-radius: 5px;
			box-shadow: 0 2px 0 rgba(0, 0, 0, 0.22);
		}

		.feature-toggles { gap: 0.24rem; }

		.feature-toggles :global(.feature-row) {
			padding: 0.36rem 0.24rem;
			border-radius: 6px;
			gap: 0.35rem;
		}

		.feature-toggles :global(.feature-name) { font-size: 0.42rem; }
		.feature-toggles :global(.feature-cost) { font-size: 0.36rem; }

		.feature-toggles :global(.feature-toggle) {
			width: 22px;
			height: 12px;
		}

		.feature-toggles :global(.knob) {
			top: 1px;
			left: 1px;
			width: 8px;
			height: 8px;
		}

		.feature-toggles :global(.feature-toggle.on .knob) {
			left: 11px;
		}

		.bet-adjuster {
			gap: 0.32rem;
			padding: 0.38rem 0.28rem;
			border-radius: 6px;
		}

		.bet-btn {
			width: 26px;
			height: 20px;
			font-size: 0.72rem;
			border-radius: 5px;
		}

		.bet-display {
			min-width: 68px;
			gap: 0.14rem;
			align-items: baseline;
		}

		.bet-label {
			font-size: 0.44rem;
			font-weight: 800;
		}

		.bet-value {
			font-size: 0.54rem;
			font-weight: 900;
		}
	}

	@media (max-height: 500px) {
		.buy-bonus-wrap:not(.popout-l):not(.popout-s):not(.portrait) {
			padding: 0.6rem 0.75rem;
			gap: 0.55rem;
			max-height: 96vh;
			overflow-y: auto;
		}

		.buy-bonus-wrap:not(.popout-l):not(.popout-s):not(.portrait) .header { min-height: 1.8rem; }
		.buy-bonus-wrap:not(.popout-l):not(.popout-s):not(.portrait) .title { font-size: 1rem; }

		.buy-bonus-wrap:not(.popout-l):not(.popout-s):not(.portrait) .close-btn {
			width: 28px;
			height: 28px;
			font-size: 1.1rem;
		}

		.buy-bonus-wrap.portrait:not(.popout-l):not(.popout-s) {
			max-height: 96vh;
			overflow-y: auto;
		}

		.cards { gap: 0.5rem; }

		.card {
			padding: 0.5rem 0.4rem 0.6rem;
			gap: 0.3rem;
		}

		.card-title { font-size: 0.68rem; min-height: 2em; }

		.icon-wrap { min-height: 52px; }

		.icon-wrap :global(.asset-placeholder) {
			width: 52px !important;
			height: 52px !important;
		}

		.card-desc { font-size: 0.48rem; min-height: 2.2em; }
		.card-price { font-size: 0.85rem; }

		.buy-button {
			min-width: 0;
			width: 100%;
			padding: 0.35rem 0.4rem;
			font-size: 0.65rem;
		}
	}
</style>
