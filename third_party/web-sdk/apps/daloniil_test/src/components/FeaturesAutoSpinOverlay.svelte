<!--
	FeaturesAutoSpinOverlay.svelte — кастомная панель автоигры для Cash Stacks.
	Открывается при stateModal.modal?.name === 'autoSpin' (после клика по
	ButtonAutoSpin). Заменяет SDK-овский full-screen ModalAutoSpin (см.
	CashStacksModals.svelte — мы исключили стандартный ModalAutoSpin).

	Состоит из трёх секций согласно дизайн-референсу:
	  1. Header «Автоигра»
	  2. «Функции» — Bonus Boost / Special Spin toggles (эксклюзивные)
	  3. «Раунды» — выбор количества (10, 25, 50, 75, 100, 250, 500, 1000, ∞)
	  + кнопки confirm / cancel внизу
-->
<script lang="ts">
	import {
		stateModal,
		stateUi,
		stateBet,
		stateBetDerived,
		AUTO_SPINS_LOSS_LIMIT_MULTIPLIER_MAP,
		AUTO_SPINS_SINGLE_WIN_LIMIT_MULTIPLIER_MAP,
	} from 'state-shared';

	import { getContext } from '../game/context';
	import CashStacksFeatureToggles from './CashStacksFeatureToggles.svelte';
	import {
		CASH_STACKS_ROUND_OPTIONS,
		CASH_STACKS_DEFAULT_ROUND,
		getRoundsCounter,
		type CashStacksRoundOption,
	} from '../game/autoplay';

	const context = getContext();

	const isOpen = $derived(stateModal.modal?.name === 'autoSpin');

	/* Источник правды для значений раундов — apps/.../game/autoplay.ts.
	   Если в state хранится значение вне списка (например, '25' из SDK
	   defaults или ∞), сбрасываем к дефолту по дизайну. */
	const ROUND_OPTIONS = CASH_STACKS_ROUND_OPTIONS;
	type RoundOption = CashStacksRoundOption;

	if (!ROUND_OPTIONS.includes(stateUi.autoSpinsText as RoundOption)) {
		stateUi.autoSpinsText = CASH_STACKS_DEFAULT_ROUND as typeof stateUi.autoSpinsText;
	}

	// Position сегмента на slider'е (0..1) для текущего значения раундов.
	const sliderProgress = $derived.by(() => {
		const idx = ROUND_OPTIONS.indexOf(stateUi.autoSpinsText as RoundOption);
		return idx < 0 ? 0 : idx / (ROUND_OPTIONS.length - 1);
	});

	/* === Drag/swipe слайдера раундов ===
	   Раньше работали только тапы по фиксированным сегментам. По UX требованию
	   нужен полноценный drag — пользователь зажимает полосу и тянет, значение
	   меняется на лету, выбирая ближайшее из ROUND_OPTIONS. */
	let sliderEl: HTMLDivElement | undefined = $state(undefined);
	let isDragging = $state(false);

	const setProgressByClientX = (clientX: number) => {
		if (!sliderEl) return;
		const rect = sliderEl.getBoundingClientRect();
		const ratio = (clientX - rect.left) / rect.width;
		const clamped = Math.max(0, Math.min(1, ratio));
		const idx = Math.round(clamped * (ROUND_OPTIONS.length - 1));
		const next = ROUND_OPTIONS[idx];
		if (next !== stateUi.autoSpinsText) {
			// Cast: SDK типизирует autoSpinsText union'ом, мы пишем кастомные
			// значения (20/30/40/70) — рантайм безопасен, в startAutoplay мы
			// читаем счётчик через свой ROUND_VALUE_MAP, а не SDK-шный.
			stateUi.autoSpinsText = next as typeof stateUi.autoSpinsText;
		}
	};

	const onPointerDown = (e: PointerEvent) => {
		isDragging = true;
		(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
		setProgressByClientX(e.clientX);
	};

	const onPointerMove = (e: PointerEvent) => {
		if (!isDragging) return;
		setProgressByClientX(e.clientX);
	};

	const onPointerUp = (e: PointerEvent) => {
		if (!isDragging) return;
		isDragging = false;
		try {
			(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
		} catch {
			/* ignore — pointer might already be released */
		}
	};

	const close = () => {
		stateModal.modal = null;
	};

	const startAutoplay = () => {
		// Считаем счётчик из локальной таблицы game/autoplay.ts (там есть
		// 20/30/40/70 которых нет в SDK-шной AUTO_SPINS_TEXT_OPTION_MAP).
		stateBet.autoSpinsCounter = getRoundsCounter(stateUi.autoSpinsText);
		stateBet.autoSpinsLossLimitAmount =
			stateBet.betAmount * AUTO_SPINS_LOSS_LIMIT_MULTIPLIER_MAP[stateUi.autoSpinsLossLimitText];
		stateBet.autoSpinsSingleWinLimitAmount =
			stateBet.betAmount *
			AUTO_SPINS_SINGLE_WIN_LIMIT_MULTIPLIER_MAP[stateUi.autoSpinsSingleWinLimitText];
		if (stateBetDerived.activeBetMode().type === 'buy') stateBet.activeBetModeKey = 'BASE';
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		context.eventEmitter.broadcast({ type: 'autoBet' });
		stateModal.modal = null;
	};
</script>

{#if isOpen}
	<!--
		Контейнер позиционирует панель по центру экрана.
		pointer-events: none на overlay + auto на card → клики проходят сквозь
		пустое пространство (HUD под панелью остаётся интерактивным),
		а сама панель ловит свои клики. Backdrop отсутствует — экран НЕ
		затемняется. Закрытие — через крестик в углу панели.
	-->
	<div class="autoplay-overlay" data-test="autoplay-overlay">
		<div class="autoplay-card" role="dialog" aria-modal="true">
			<header class="autoplay-header">
				<h3 class="autoplay-title">{context.i18nDerived.autoplayTitle()}</h3>
				<button type="button" class="close-button" onclick={close} aria-label="close">×</button>
			</header>

			<!-- === ФУНКЦИИ === -->
			<section class="autoplay-section">
				<CashStacksFeatureToggles showSectionTitle />
			</section>


			<!-- === РАУНДЫ === -->
			<section class="autoplay-section">
				<div class="section-title">{context.i18nDerived.autoplayRounds()}</div>

				<div class="rounds-display">{stateUi.autoSpinsText}</div>

				<!--
					Полоса прогресса (как в дизайне): голубой fill = текущий
					процент выбранного значения относительно всего диапазона.
					Поддерживает И тап (моментально перемещает к точке клика),
					И drag (тянуть пальцем/мышкой меняя значение на лету).
					Реализовано через pointer-events с pointerCapture.
				-->
				<div
					bind:this={sliderEl}
					class="rounds-slider"
					role="slider"
					aria-label="rounds"
					aria-valuemin={0}
					aria-valuemax={ROUND_OPTIONS.length - 1}
					aria-valuenow={ROUND_OPTIONS.indexOf(stateUi.autoSpinsText)}
					aria-valuetext={stateUi.autoSpinsText}
					tabindex="0"
					onpointerdown={onPointerDown}
					onpointermove={onPointerMove}
					onpointerup={onPointerUp}
					onpointercancel={onPointerUp}
					data-test="rounds-slider"
				>
					<div class="slider-bar">
						<div
							class="slider-bar-fill"
							style:width={`${sliderProgress * 100}%`}
						></div>
					</div>
				</div>
			</section>

			<!--
				Внутри модалки кнопки Start НЕТ — её роль выполняет центральная
				Spin-кнопка (см. CashStacksStartAutoplayButton в UiCashStacksLayout).
				Это явное требование дизайна: bet-кнопка стартует автоигру,
				AUTO-кнопка превращается в красный крестик (отмена).
			-->
		</div>
	</div>
{/if}

<style lang="scss">
	/*
		Overlay — прозрачный контейнер на весь экран без backdrop.
		pointer-events: none пропускает клики СКВОЗЬ overlay (HUD внизу
		остаётся интерактивным), а .autoplay-card pointer-events: auto.
		Карточка прижата к правому-нижнему углу, сразу над HUD-баром
		(который занимает примерно 100-130px высоты).
	*/
	.autoplay-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: flex-end;
		justify-content: flex-end;
		padding: 0 1.2rem 9rem 0;
		pointer-events: none;
	}

	.autoplay-card {
		width: min(280px, 80vw);
		background: linear-gradient(180deg, #1f3050 0%, #122340 100%);
		border-radius: 14px;
		padding: 0.9rem 1rem 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		box-shadow: 0 14px 36px rgba(0, 0, 0, 0.55);
		color: #fff;
		font-family: 'proxima-nova', sans-serif;
		pointer-events: auto;
	}

	.autoplay-header {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 1.8rem;
	}

	.autoplay-title {
		margin: 0;
		font-size: 1.3rem;
		font-weight: 800;
		letter-spacing: 0.01em;
		color: #fff;
		text-align: center;
	}

	.close-button {
		position: absolute;
		right: -0.4rem;
		top: -0.2rem;
		background: none;
		border: 0;
		color: rgba(255, 255, 255, 0.55);
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		padding: 0.2rem 0.4rem;

		&:hover { color: #fff; }
	}

	.autoplay-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* Жёлто-оранжевый заголовок секций как на референсе. */
	.section-title {
		font-size: 1.1rem;
		font-weight: 800;
		color: #f0c674;
		text-align: center;
		letter-spacing: 0.01em;
	}

	.rounds-display {
		text-align: center;
		font-size: 1.8rem;
		font-weight: 800;
		line-height: 1;
		padding: 0.3rem 0 0.4rem;
		background: rgba(0, 0, 0, 0.28);
		border-radius: 10px 10px 0 0;
		margin-bottom: -0.2rem;
	}

	/*
		Полоса прогресса (как в дизайне): голубой fill = текущий процент
		выбранного значения относительно всего диапазона. Сам контейнер
		.rounds-slider — это interactive surface, ловит pointer-события
		на всю свою область и pad'у для удобного захвата пальцем.
		touch-action: none — чтобы браузер не пытался скроллить страницу
		при свайпе горизонтально по слайдеру.
	*/
	.rounds-slider {
		position: relative;
		background: rgba(0, 0, 0, 0.28);
		border-radius: 0 0 10px 10px;
		padding: 0.7rem 0.7rem 0.9rem;
		cursor: pointer;
		touch-action: none;
		user-select: none;

		&:focus { outline: none; }
		&:focus-visible { outline: 2px solid rgba(110, 193, 255, 0.6); }
	}

	.slider-bar {
		position: relative;
		height: 18px;
		background: #0a1628;
		border-radius: 5px;
		overflow: hidden;
		pointer-events: none;
	}

	.slider-bar-fill {
		height: 100%;
		background: linear-gradient(180deg, #6ec1ff 0%, #3a93e0 100%);
		transition: width 0.12s ease-out;
	}
</style>
