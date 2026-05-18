<!--
	BuyBonusConfirmOverlay.svelte — кастомное Confirm-меню покупки бонуса
	для Cash Stacks (заменяет SDK-овский ModalBuyBonusConfirm).

	Дизайн совпадает с BuyBonusOverlay (тёмно-синяя карточка + красный X
	справа от заголовка + голубой ребёнок-card), внутри:
	  - иконка бонуса (с бейджем ×3 для super)
	  - крупная цена в реальной валюте (bet × множитель)
	  - описание (uppercase, мельче)
	  - футер: «< НАЗАД» (возврат в BuyBonus) и жёлтый «КУПИТЬ» (confirm).

	На «КУПИТЬ» → emit `bet` (то же что делает SDK ModalBuyBonusConfirm)
	→ SDK xstate.bet проходит покупку фичи под текущим activeBetModeKey.
-->
<script lang="ts">
	import { stateModal, stateBet } from 'state-shared';
	import { stateBonus } from 'components-ui-html/src/stateBonus.svelte';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import AssetPlaceholder from './AssetPlaceholder.svelte';

	const context = getContext();

	const isOpen = $derived(stateModal.modal?.name === 'buyBonusConfirm');

	/* Определяем какой бонус выбран по stateBonus.selectedBetModeKey — его
	   выставляет BuyBonusOverlay при клике на КУПИТЬ (мы НЕ трогаем там
	   stateBet.activeBetModeKey, чтобы HUD не пересчитывал bet под цену
	   бонуса до подтверждения). */
	const isSuper = $derived(stateBonus.selectedBetModeKey === 'bonus_super');
	const NORMAL_MULT = 100;
	const SUPER_MULT = 200;
	const multiplier = $derived(isSuper ? SUPER_MULT : NORMAL_MULT);
	const price = $derived(numberToCurrencyString(stateBet.betAmount * multiplier));

	const title = $derived(context.i18nDerived.buyBonusTitle());
	const description = $derived(
		isSuper ? context.i18nDerived.buySuperDesc() : context.i18nDerived.buyNormalDesc(),
	);
	/* «×3 Sticky Mystery Reels» это особенность ТОЛЬКО super-бонуса. На
	   normal-bonus бейдж не показываем (это будет просто иконка bonus). */
	const showMultiplierBadge = $derived(isSuper);

	const goBack = () => {
		stateModal.modal = { name: 'buyBonus' };
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const closeAll = () => {
		stateModal.modal = null;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const confirm = () => {
		/*
			Финальный set activeBetModeKey происходит ТОЛЬКО здесь, после
			явного подтверждения. До этого HUD продолжает работать в режиме
			BASE и не падает (см. stateGame.svelte.ts — мы регистрируем
			betModeMeta для наших ключей чтобы lookup не возвращал null).
			После set activeBetModeKey эмитим `bet` — SDK xstate.bet
			отправит запрос с правильным mode='bonus_normal'/'bonus_super'.
		*/
		stateBet.activeBetModeKey = stateBonus.selectedBetModeKey;
		stateModal.modal = null;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		context.eventEmitter.broadcast({ type: 'bet' });
	};
</script>

<!--
	`<svelte:window>` обязан быть на верхнем уровне (не внутри {#if}). Внутри
	хэндлера сами проверяем isOpen — для закрытия по ESC.
-->
<svelte:window
	onkeydown={(e) => {
		if (isOpen && e.key === 'Escape') closeAll();
	}}
/>

{#if isOpen}
	<!--
		Свой backdrop вместо SDK-овского Popup. Popup рендерит children
		ДВАЖДЫ (раз вне pop-up-wrap, раз внутри) — это вызывает дубликаты в
		DOM и из-за невидимого click-to-close слоя клики по нашим кнопкам
		часто уходят в close. Прямой backdrop проще и надёжнее.

		Backdrop здесь без onclick (не закрываем по клику мимо) — confirm
		закрывается явно через X / НАЗАД / КУПИТЬ.
	-->
	<div class="backdrop">
		<div
			class="confirm-wrap"
			role="dialog"
			aria-modal="true"
			data-test="buy-bonus-confirm-overlay"
		>
			<header class="header">
				<h2 class="title">{title}</h2>
				<button
					type="button"
					class="close-btn"
					onclick={closeAll}
					aria-label="close"
					data-test="buy-bonus-confirm-close"
				>
					×
				</button>
			</header>

			<div class="card">
				<div class="icon-wrap">
					<AssetPlaceholder
						label={isSuper ? 'SUPER' : 'BONUS'}
						variant={isSuper ? 'super' : 'bonus'}
						width={110}
						height={110}
					/>
					{#if showMultiplierBadge}
						<span class="multiplier-badge">×3</span>
					{/if}
				</div>

				<div class="price" data-test="buy-bonus-confirm-price">{price}</div>

				<div class="description">{description}</div>

				<footer class="actions">
					<button
						type="button"
						class="back-btn"
						onclick={goBack}
						data-test="buy-bonus-confirm-back"
					>
						<span class="back-chevron">‹</span>
						{context.i18nDerived.buyCancel()}
					</button>
					<button
						type="button"
						class="confirm-btn"
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
	/*
		Свой backdrop поверх всего UI. zIndex 70 такой же как у наших других
		модалок поверх HUD (см. BuyBonusOverlay zIndex 60 и Pixi UI).
		Клик по backdrop'у закрывает модалку, клики внутри `.confirm-wrap`
		останавливают всплытие через onclick stopPropagation в шаблоне.
	*/
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 70;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.confirm-wrap {
		position: relative;
		width: min(520px, 92vw);
		padding: 1.2rem 1.4rem 1.2rem;
		background: linear-gradient(180deg, #14233a 0%, #0a1628 100%);
		border-radius: 18px;
		border: 1px solid rgba(255, 255, 255, 0.06);
		color: #fff;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-family: 'proxima-nova', sans-serif;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.55);
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
		font-size: 1.45rem;
		font-weight: 800;
		letter-spacing: 0.03em;
	}

	.close-btn {
		position: absolute;
		right: 0;
		top: 0;
		width: 34px;
		height: 34px;
		border-radius: 8px;
		border: 0;
		background: #d32f2f;
		color: #fff;
		font-size: 1.4rem;
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

	/*
		Голубая внутренняя карточка — то же что в BuyBonusOverlay.
	*/
	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
		padding: 1.2rem 1.2rem 1rem;
		background: linear-gradient(180deg, #4a8bbb 0%, #3a6f95 100%);
		border-radius: 12px;
		text-align: center;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.28);
	}

	.icon-wrap {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 110px;
	}

	.multiplier-badge {
		position: absolute;
		bottom: -6px;
		right: -6px;
		min-width: 36px;
		height: 32px;
		padding: 0 0.45rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(180deg, #ffd96b 0%, #d6a233 100%);
		color: #2b1f08;
		font-weight: 900;
		font-size: 0.95rem;
		letter-spacing: 0.02em;
		border-radius: 8px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
		border: 2px solid #2b1f08;
	}

	.price {
		font-size: 1.85rem;
		font-weight: 900;
		color: #ffffff;
		letter-spacing: 0.01em;
	}

	.description {
		font-size: 0.85rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.95);
		line-height: 1.4;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		max-width: 360px;
	}

	.actions {
		margin-top: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.4rem;
	}

	/* Кнопка НАЗАД — текстовая, со шевроном слева. */
	.back-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		background: transparent;
		border: 0;
		color: #fff;
		font-size: 0.95rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		cursor: pointer;
		padding: 0.55rem 0.6rem;
		border-radius: 6px;
		transition: filter 0.1s, transform 0.05s;

		&:hover { filter: brightness(1.1); }
		&:active { transform: translateY(1px); }
	}

	.back-chevron {
		font-size: 1.3rem;
		line-height: 1;
	}

	/* Кнопка КУПИТЬ — жёлтая, такая же как в BuyBonusOverlay. */
	.confirm-btn {
		padding: 0.6rem 2.2rem;
		font-size: 1rem;
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
</style>
