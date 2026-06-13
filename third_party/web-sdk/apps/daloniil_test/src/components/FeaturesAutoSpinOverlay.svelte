<!--
	FeaturesAutoSpinOverlay.svelte — кастомная панель автоигры для Cash Stacks.
	Открывается при stateModal.modal?.name === 'autoSpin' (после клика по
	ButtonAutoSpin). Заменяет SDK-овский full-screen ModalAutoSpin (см.
	CashStacksModals.svelte — мы исключили стандартный ModalAutoSpin).

	Состоит из трёх секций согласно дизайн-референсу:
	  1. Header «Автоигра»
	  2. «Функции» — Bonus Boost toggle
	  3. «Раунды» — выбор количества (10, 25, 50, 75, 100, 250, 500, 1000, ∞)
	  4. «Начать автоигру (N)» — запуск с выбранными параметрами.
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

	import { canAffordSpin } from '../game/buyBonusBalance';
	import { getContext } from '../game/context';
	import { computePopupHudLayout } from '../game/popupHudLayout';
	import { getContextLayout } from 'utils-layout';
	import CashStacksFeatureToggles from './CashStacksFeatureToggles.svelte';
	import {
		CASH_STACKS_ROUND_OPTIONS,
		CASH_STACKS_DEFAULT_ROUND,
		getRoundsCounter,
		type CashStacksRoundOption,
	} from '../game/autoplay';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const popup = $derived(computePopupHudLayout(stateLayoutDerived));
	const isOpen = $derived(stateModal.modal?.name === 'autoSpin');

	$effect(() => {
		if (isOpen) stateUi.menuOpen = false;
	});
	const featureTogglesDisabled = $derived(!context.stateXstateDerived.isIdle());
	const startDisabled = $derived(!canAffordSpin());
	const startLabel = $derived(
		context.i18nDerived.autoplayStartWithRounds(String(stateUi.autoSpinsText)),
	);

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
		if (!canAffordSpin()) return;
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
		<div
			class="autoplay-card"
			role="dialog"
			aria-modal="true"
			style:width="{popup.autoplay.width}px"
			style:left="{popup.autoplay.left}px"
			style:bottom="{popup.autoplay.bottom}px"
			style:padding="{popup.autoplay.padding}px"
			style:gap="{popup.autoplay.gap}px"
			style:border-radius="{popup.autoplay.borderRadius}px"
			style:--popup-section-title="{popup.autoplay.sectionTitleSize}px"
			style:--popup-feature-name="{popup.autoplay.featureNameSize}px"
			style:--popup-feature-cost="{popup.autoplay.featureCostSize}px"
			style:--popup-feature-row-py="{popup.autoplay.featureRowPadY}px"
			style:--popup-feature-row-px="{popup.autoplay.featureRowPadX}px"
			style:--popup-toggle-w="{popup.autoplay.toggleW}px"
			style:--popup-toggle-h="{popup.autoplay.toggleH}px"
			style:--popup-knob-size="{popup.autoplay.knobSize}px"
			style:--popup-scale="{popup.scale}"
		>
			<header class="autoplay-header" style:min-height="{popup.autoplay.titleSize * 1.2}px">
				<h3 class="autoplay-title" style:font-size="{popup.autoplay.titleSize}px">
					{context.i18nDerived.autoplayTitle()}
				</h3>
				<button
					type="button"
					class="close-button"
					style:font-size="{popup.autoplay.titleSize * 1.15}px"
					onclick={close}
					aria-label="close"
				>×</button>
			</header>

			<!-- === ФУНКЦИИ === -->
			<section class="autoplay-section">
				<CashStacksFeatureToggles
					showSectionTitle
					features={['bonus_boost']}
					disabled={featureTogglesDisabled}
				/>
			</section>


			<!-- === РАУНДЫ === -->
			<section class="autoplay-section" style:gap="{popup.autoplay.gap * 0.7}px">
				<div class="section-title" style:font-size="{popup.autoplay.sectionTitleSize}px">
					{context.i18nDerived.autoplayRounds()}
				</div>

				<div class="rounds-display" style:font-size="{popup.autoplay.roundsSize}px">
					{stateUi.autoSpinsText}
				</div>

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
					style:padding="{popup.autoplay.sliderPadY}px {popup.autoplay.sliderPadX}px"
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
					<div class="slider-bar" style:height="{popup.autoplay.sliderTrackHeight}px">
						<div
							class="slider-bar-fill"
							style:width={`${sliderProgress * 100}%`}
						></div>
					</div>
				</div>
			</section>

			<button
				type="button"
				class="start-button"
				style:font-size="{popup.autoplay.startFontSize}px"
				style:padding="{popup.autoplay.startPaddingY}px {popup.autoplay.featureRowPadX}px"
				style:border-radius="{popup.autoplay.borderRadius * 0.7}px"
				disabled={startDisabled}
				onclick={startAutoplay}
				data-test="autoplay-start-button"
			>
				{startLabel}
			</button>
		</div>
	</div>
{/if}

<style lang="scss">
	.autoplay-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		pointer-events: none;
	}

	.autoplay-card {
		position: fixed;
		background: linear-gradient(180deg, #1f3050 0%, #122340 100%);
		display: flex;
		flex-direction: column;
		box-shadow: 0 14px 36px rgba(0, 0, 0, 0.55);
		color: #fff;
		font-family: 'proxima-nova', sans-serif;
		pointer-events: auto;
		box-sizing: border-box;
	}

	.autoplay-header {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.autoplay-title {
		margin: 0;
		font-weight: 800;
		letter-spacing: 0.01em;
		color: #fff;
		text-align: center;
	}

	.close-button {
		position: absolute;
		right: -0.25em;
		top: -0.15em;
		background: none;
		border: 0;
		color: rgba(255, 255, 255, 0.55);
		line-height: 1;
		cursor: pointer;
		padding: 0.15em 0.35em;

		&:hover { color: #fff; }
	}

	.autoplay-section {
		display: flex;
		flex-direction: column;
	}

	.autoplay-card :global(.section-title) {
		font-size: var(--popup-section-title);
		font-weight: 800;
		color: #f0c674;
		text-align: center;
		letter-spacing: 0.01em;
		margin-bottom: calc(2px * var(--popup-scale, 1));
	}

	.autoplay-card :global(.feature-row) {
		padding: var(--popup-feature-row-py) var(--popup-feature-row-px);
		border-radius: calc(8px * var(--popup-scale, 1));
		gap: calc(6px * var(--popup-scale, 1));
	}

	.autoplay-card :global(.feature-info) {
		gap: calc(2px * var(--popup-scale, 1));
	}

	.autoplay-card :global(.feature-name) {
		font-size: var(--popup-feature-name);
		font-weight: 700;
		line-height: 1.2;
	}

	.autoplay-card :global(.feature-cost) {
		font-size: var(--popup-feature-cost);
		font-weight: 700;
		line-height: 1.2;
	}

	.autoplay-card :global(.feature-toggle) {
		width: var(--popup-toggle-w);
		height: var(--popup-toggle-h);
	}

	.autoplay-card :global(.feature-toggle .knob) {
		width: var(--popup-knob-size);
		height: var(--popup-knob-size);
		top: calc((var(--popup-toggle-h) - var(--popup-knob-size)) / 2);
		left: calc((var(--popup-toggle-h) - var(--popup-knob-size)) / 2);
	}

	.autoplay-card :global(.feature-toggle.on .knob) {
		left: calc(
			var(--popup-toggle-w) - var(--popup-knob-size) -
				(var(--popup-toggle-h) - var(--popup-knob-size)) / 2
		);
	}

	.section-title {
		font-weight: 800;
		color: #f0c674;
		text-align: center;
		letter-spacing: 0.01em;
	}

	.rounds-display {
		text-align: center;
		font-weight: 800;
		line-height: 1;
		padding: 0.25em 0 0.35em;
		background: rgba(0, 0, 0, 0.28);
		border-radius: calc(8px * var(--popup-scale, 1)) calc(8px * var(--popup-scale, 1)) 0 0;
		margin-bottom: calc(-2px * var(--popup-scale, 1));
	}

	.rounds-slider {
		position: relative;
		background: rgba(0, 0, 0, 0.28);
		border-radius: 0 0 calc(8px * var(--popup-scale, 1)) calc(8px * var(--popup-scale, 1));
		cursor: pointer;
		touch-action: none;
		user-select: none;

		&:focus { outline: none; }
		&:focus-visible { outline: 2px solid rgba(110, 193, 255, 0.6); }
	}

	.slider-bar {
		position: relative;
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

	.start-button {
		width: 100%;
		margin-top: calc(2px * var(--popup-scale, 1));
		border: 1px solid rgba(110, 193, 255, 0.55);
		background: linear-gradient(180deg, #6ec1ff 0%, #3a93e0 100%);
		color: #fff;
		font-family: inherit;
		font-weight: 800;
		line-height: 1.2;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		cursor: pointer;
		box-shadow: 0 4px 16px rgba(58, 147, 224, 0.4);
		transition: opacity 0.15s;

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
			pointer-events: none;
		}
	}
</style>
