<!--
	FeaturesAutoSpinOverlay.svelte — меню автоигры по designer_assets/bg_auto.png.
	Открывается при stateModal.modal?.name === 'autoSpin'. Закрытие — cross,
	клик по пустому месту или повторный клик по autoplay в HUD.
-->
<script lang="ts">
	import { scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { stateModal, stateUi } from 'state-shared';
	import { OnHotkey } from 'components-shared';

	import { canAffordSpin } from '../game/buyBonusBalance';
	import { getContext } from '../game/context';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';
	import { getContextLayout } from 'utils-layout';
	import CashStacksFeatureToggles from './CashStacksFeatureToggles.svelte';
	import {
		CASH_STACKS_MIN_ROUNDS,
		CASH_STACKS_MAX_ROUNDS,
		CASH_STACKS_ROUND_LABELS,
		getRoundsCounter,
		roundsToProgress,
		progressToRounds,
		launchCashStacksAutoplay,
	} from '../game/autoplay';
	import { computeAutoplayPanelAnchor } from '../game/popupHudLayout';
	import { AUTOSPIN_ASSETS, HUD_ASSETS } from '../game/uiHtmlAssetManifest';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const bgUrl = AUTOSPIN_ASSETS.bg;
	const closeIconUrl = AUTOSPIN_ASSETS.close;
	const sliderHeadUrl = AUTOSPIN_ASSETS.sliderHead;
	const sliderFullUrl = AUTOSPIN_ASSETS.sliderFull;
	const sliderButtonUrl = AUTOSPIN_ASSETS.sliderButton;
	const sliderEmptyUrl = AUTOSPIN_ASSETS.sliderEmpty;
	const minusUrl = HUD_ASSETS.betMinus;
	const plusUrl = HUD_ASSETS.betPlus;
	const startButtonUrl = AUTOSPIN_ASSETS.startButton;

	const PANEL_IN_MS = 400;
	const PANEL_OUT_MS = 240;

	const isOpen = $derived(stateModal.modal?.name === 'autoSpin');
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPortrait = $derived(layoutType === 'portrait');
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);
	const panelAnchor = $derived(computeAutoplayPanelAnchor(stateLayoutDerived));
	const useAnchoredLayout = $derived(panelAnchor !== null);

	$effect(() => {
		if (isOpen) stateUi.menuOpen = false;
	});

	const featureTogglesDisabled = $derived(!context.stateXstateDerived.isIdle());
	const startDisabled = $derived(featureTogglesDisabled || !canAffordSpin());

	const roundsCount = $derived(getRoundsCounter(stateUi.autoSpinsText));

	$effect(() => {
		const normalized = String(roundsCount);
		if (stateUi.autoSpinsText !== normalized) {
			stateUi.autoSpinsText = normalized as typeof stateUi.autoSpinsText;
		}
	});

	let trackEl: HTMLDivElement | undefined = $state(undefined);
	let isDragging = $state(false);
	let dragProgress = $state<number | null>(null);

	const displayProgress = $derived(dragProgress ?? roundsToProgress(roundsCount));

	const applyRounds = (value: number, playSound: 'minus' | 'plus' | 'general' | false = false) => {
		const next = String(value);
		if (next === stateUi.autoSpinsText) return;
		stateUi.autoSpinsText = next as typeof stateUi.autoSpinsText;
		if (playSound === 'minus') context.eventEmitter.broadcast({ type: 'soundPressMinus' });
		if (playSound === 'plus') context.eventEmitter.broadcast({ type: 'soundPressPlus' });
		if (playSound === 'general') context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const setRoundByClientX = (clientX: number) => {
		if (!trackEl || featureTogglesDisabled) return;
		const rect = trackEl.getBoundingClientRect();
		const thumbPx = rect.height * (48 / 95);
		const usable = Math.max(1, rect.width - thumbPx);
		const ratio = (clientX - rect.left - thumbPx * 0.5) / usable;
		const clamped = Math.max(0, Math.min(1, ratio));
		dragProgress = clamped;
		applyRounds(progressToRounds(clamped), false);
	};

	const onTrackPointerDown = (e: PointerEvent) => {
		if (featureTogglesDisabled) return;
		isDragging = true;
		(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
		setRoundByClientX(e.clientX);
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};

	const onTrackPointerMove = (e: PointerEvent) => {
		if (!isDragging) return;
		setRoundByClientX(e.clientX);
	};

	const onTrackPointerUp = (e: PointerEvent) => {
		if (!isDragging) return;
		isDragging = false;
		dragProgress = null;
		try {
			(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
		} catch {
			/* pointer might already be released */
		}
	};

	const decreaseDisabled = $derived(
		featureTogglesDisabled || roundsCount <= CASH_STACKS_MIN_ROUNDS,
	);
	const increaseDisabled = $derived(
		featureTogglesDisabled || roundsCount >= CASH_STACKS_MAX_ROUNDS,
	);

	const onDecreasePress = () => {
		if (decreaseDisabled) return;
		applyRounds(roundsCount - 1, 'minus');
	};

	const onIncreasePress = () => {
		if (increaseDisabled) return;
		applyRounds(roundsCount + 1, 'plus');
	};

	const close = () => {
		stateModal.modal = null;
	};

	const startAutoplay = () => {
		launchCashStacksAutoplay((event) => context.eventEmitter.broadcast(event));
	};

	const startAutoplayLabel = $derived(context.i18nDerived.startAutoplay());
</script>

{#if isOpen}
	<OnHotkey hotkey="Space" disabled={startDisabled} onpress={startAutoplay} />
	<div class="autoplay-overlay" class:anchored={useAnchoredLayout} data-test="autoplay-overlay">
		<button
			type="button"
			class="autoplay-backdrop"
			aria-label="close"
			onclick={close}
			data-test="autoplay-backdrop"
		></button>

		<div
			class="autoplay-panel"
			class:portrait={isPortrait}
			class:popout-l={isPopout}
			class:popout-s={isPopoutSmall}
			style:left={useAnchoredLayout ? `${panelAnchor!.left}px` : undefined}
			style:bottom={useAnchoredLayout ? `${panelAnchor!.bottom}px` : undefined}
			style:--panel-width={useAnchoredLayout ? `${panelAnchor!.width}px` : undefined}
			in:scale={{ duration: PANEL_IN_MS, easing: backOut, start: 0.86, opacity: 0 }}
			out:scale={{ duration: PANEL_OUT_MS, easing: cubicOut, start: 0.95, opacity: 0 }}
			role="dialog"
			aria-modal="true"
			aria-label={context.i18nDerived.autoplayTitle()}
		>
			<img class="panel-bg" src={bgUrl} alt="" draggable="false" />

			<div class="panel-content">
				<header class="panel-header">
					<h3 class="panel-title">{context.i18nDerived.autoplayTitle()}</h3>
					<button
						type="button"
						class="close-button"
						onclick={close}
						aria-label="close"
						data-test="autoplay-close"
					>
						<img class="close-icon" src={closeIconUrl} alt="" draggable="false" />
					</button>
				</header>

				<section class="features-section" aria-label={context.i18nDerived.autoplayFeatures()}>
					<CashStacksFeatureToggles
						features={['bonus_boost']}
						disabled={featureTogglesDisabled}
						noHoverBg
					/>
				</section>

				<p class="rounds-title" aria-hidden="true">{context.i18nDerived.autoplayRounds()}</p>

				<section class="rounds-stepper" aria-label={context.i18nDerived.autoplayRounds()}>
					<button
						type="button"
						class="rounds-stepper-btn"
						class:dimmed={decreaseDisabled}
						style:background-image="url('{minusUrl}')"
						disabled={decreaseDisabled}
						aria-label="decrease rounds"
						data-test="autoplay-rounds-decrease"
						onclick={onDecreasePress}
					></button>

					<p class="rounds-stepper-value" data-test="autoplay-rounds-value">
						{roundsCount}
					</p>

					<button
						type="button"
						class="rounds-stepper-btn"
						class:dimmed={increaseDisabled}
						style:background-image="url('{plusUrl}')"
						disabled={increaseDisabled}
						aria-label="increase rounds"
						data-test="autoplay-rounds-increase"
						onclick={onIncreasePress}
					></button>
				</section>

				<section class="rounds-section" aria-label={context.i18nDerived.autoplayRounds()}>
					<div class="rounds-slider" class:disabled={featureTogglesDisabled}>
						<div class="slider-rail">
							<img class="slider-head" src={sliderHeadUrl} alt="" draggable="false" />

							<div
								bind:this={trackEl}
								class="slider-track-wrap"
								class:dragging={isDragging}
								style:--progress={displayProgress}
								role="slider"
								aria-label={context.i18nDerived.autoplayRounds()}
								aria-valuemin={CASH_STACKS_MIN_ROUNDS}
								aria-valuemax={CASH_STACKS_MAX_ROUNDS}
								aria-valuenow={roundsCount}
								aria-valuetext={String(roundsCount)}
								tabindex={featureTogglesDisabled ? -1 : 0}
								onpointerdown={onTrackPointerDown}
								onpointermove={onTrackPointerMove}
								onpointerup={onTrackPointerUp}
								onpointercancel={onTrackPointerUp}
								data-test="autoplay-rounds-slider"
							>
								<div class="slider-track">
									<img class="slider-empty" src={sliderEmptyUrl} alt="" draggable="false" />
									<div class="slider-fill">
										<img class="slider-full" src={sliderFullUrl} alt="" draggable="false" />
									</div>
								</div>
								<img class="slider-thumb" src={sliderButtonUrl} alt="" draggable="false" />
							</div>
						</div>
					</div>

					<div class="rounds-labels" aria-hidden="true">
						<div class="rounds-labels-rail">
							<span class="rounds-labels-head-spacer"></span>
							<div class="rounds-labels-track">
								{#each CASH_STACKS_ROUND_LABELS as label (label)}
									<span
										class="rounds-label"
										style:left="calc(var(--thumb-width) * 0.5 + {roundsToProgress(label)} * (100% - var(--thumb-width)))"
									>
										{label}
									</span>
								{/each}
							</div>
						</div>
					</div>
				</section>

				<section class="start-section">
					<button
						type="button"
						class="start-button"
						class:dimmed={startDisabled}
						disabled={startDisabled}
						aria-label={startAutoplayLabel}
						data-test="autoplay-start"
						onclick={startAutoplay}
					>
						<img class="start-button-bg" src={startButtonUrl} alt="" draggable="false" />
						<span class="start-button-label">{startAutoplayLabel}</span>
					</button>
				</section>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.autoplay-backdrop {
		position: absolute;
		inset: 0;
		z-index: 0;
		border: 0;
		padding: 0;
		margin: 0;
		background: transparent;
		pointer-events: auto;
		cursor: default;
		-webkit-tap-highlight-color: transparent;
	}

	.autoplay-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px;
		box-sizing: border-box;
	}

	.autoplay-overlay.anchored {
		display: block;
		padding: 0;
	}

	.autoplay-panel {
		--panel-width: min(400px, 92vw);
		position: relative;
		width: var(--panel-width);
		aspect-ratio: 1329 / 1444;
		pointer-events: auto;
		z-index: 1;
		filter: drop-shadow(0 16px 42px rgba(0, 0, 0, 0.65));
		transform-origin: center center;
	}

	.autoplay-overlay.anchored .autoplay-panel {
		position: fixed;
		aspect-ratio: 1329 / 1380;
		transform-origin: 55% 100%;
		z-index: 1;
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
		display: flex;
		flex-direction: column;
	}

	.panel-header {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 20.5%;
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		padding: 0 7.5% 0 24%;
		box-sizing: border-box;
		pointer-events: none;
	}

	.panel-title {
		margin: 0;
		grid-column: 1;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.085);
		font-style: italic;
		font-weight: 900;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #d4b44a;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.85),
			0 2px 6px rgba(0, 0, 0, 0.65);
		text-align: center;
		line-height: 1.1;
		pointer-events: none;
	}

	.close-button {
		position: relative;
		grid-column: 2;
		width: calc(var(--panel-width) * 0.125);
		height: calc(var(--panel-width) * 0.125);
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

	.features-section {
		position: absolute;
		top: 32.5%;
		left: 10.5%;
		right: 9%;
		height: 13%;
		display: flex;
		align-items: center;
		box-sizing: border-box;
	}

	.features-section :global(.feature-row) {
		width: 100%;
		height: 100%;
		display: grid;
		grid-template-columns: 28% minmax(0, 1fr) auto;
		align-items: center;
		padding: 0 3.5% 0 0;
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

	.features-section :global(.feature-info) {
		grid-column: 2;
		justify-self: start;
		align-self: center;
		min-width: 0;
		max-width: 100%;
		margin-left: calc(var(--panel-width) * -0.015);
		gap: calc(var(--panel-width) * 0.014);
		overflow: hidden;
	}

	.features-section :global(.feature-row.compact .feature-name),
	.features-section :global(.feature-row .feature-name) {
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.046);
		font-style: italic;
		font-weight: 900;
		text-transform: uppercase;
		color: #d4b44a;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.85),
			0 2px 6px rgba(0, 0, 0, 0.65);
		line-height: 1.1;
		letter-spacing: 0.05em;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.features-section :global(.feature-cost) {
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.036);
		font-weight: 700;
		color: #4cd964;
		letter-spacing: 0.03em;
		line-height: 1.15;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.75);
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.features-section :global(.feature-toggle) {
		grid-column: 3;
		width: calc(var(--panel-width) * 0.1);
		height: calc(var(--panel-width) * 0.055);
		flex-shrink: 0;
		background: rgba(0, 0, 0, 0.55);
	}

	.features-section :global(.feature-toggle.on) {
		background: #4cd964;
	}

	.features-section :global(.feature-toggle .knob) {
		width: calc(var(--panel-width) * 0.046);
		height: calc(var(--panel-width) * 0.046);
		top: calc((var(--panel-width) * 0.055 - var(--panel-width) * 0.046) / 2);
		left: calc((var(--panel-width) * 0.055 - var(--panel-width) * 0.046) / 2);
		background: #8a8a8a;
	}

	.features-section :global(.feature-toggle.on .knob) {
		left: calc(
			var(--panel-width) * 0.1 - var(--panel-width) * 0.046 -
				(var(--panel-width) * 0.055 - var(--panel-width) * 0.046) / 2
		);
		background: #fff;
	}

	.rounds-section {
		position: absolute;
		top: 66%;
		left: 8%;
		right: 8%;
		height: 14%;
		box-sizing: border-box;
		--head-width: calc(var(--panel-width) * 0.11);
		/* Трек заходит под правый край головы — без зазора до линии. */
		--track-start: calc(var(--head-width) * 0.84);
		--thumb-width: calc(var(--panel-width) * 0.048);
	}

	.rounds-slider {
		width: 100%;
		min-height: calc(var(--panel-width) * 0.1);

		&.disabled {
			opacity: 0.5;
			pointer-events: none;
		}
	}

	.slider-rail {
		position: relative;
		width: 100%;
		height: calc(var(--panel-width) * 0.105);
		--slider-line-height: calc(var(--panel-width) * 0.04);
		--slider-fill-height: calc(var(--panel-width) * 0.2);
		/* Компенсация прозрачных полей в PNG (empty: 114/1019, full: 144/1090). */
		--empty-img-scale: calc(1019 / 886);
		--empty-img-offset: calc(-100% * 114 / 886);
		--full-img-scale: calc(1090 / 850);
		--full-img-offset: calc(-100cqw * 144 / 850);
	}

	.slider-head {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: var(--head-width);
		height: auto;
		object-fit: contain;
		pointer-events: none;
		user-select: none;
		z-index: 3;
	}

	.slider-track-wrap {
		position: absolute;
		left: var(--track-start);
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		height: calc(var(--panel-width) * 0.095);
		cursor: pointer;
		touch-action: none;
		user-select: none;
		z-index: 1;

		&:focus {
			outline: none;
		}

		&:focus-visible {
			outline: 2px solid rgba(212, 180, 74, 0.55);
			outline-offset: 2px;
			border-radius: 999px;
		}
	}

	.slider-track {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		height: calc(var(--panel-width) * 0.078);
		transform: translateY(-50%);
		overflow: visible;
		container-type: inline-size;
	}

	.slider-empty {
		position: absolute;
		top: 50%;
		width: calc(100% * var(--empty-img-scale));
		height: var(--slider-line-height);
		left: var(--empty-img-offset);
		transform: translateY(-50%);
		object-fit: fill;
		pointer-events: none;
		user-select: none;
		z-index: 0;
	}

	.slider-fill {
		position: absolute;
		left: 0;
		top: 50%;
		height: var(--slider-fill-height);
		transform: translateY(-50%);
		overflow: hidden;
		min-width: 0;
		pointer-events: none;
		z-index: 1;
		width: calc(
			var(--thumb-width) * 0.5 * clamp(0, var(--progress) * 9999, 1) + var(--progress) *
				(100% - var(--thumb-width))
		);
		transition: width 0.32s ease-in-out;
	}

	.slider-track-wrap.dragging .slider-fill,
	.slider-track-wrap.dragging .slider-thumb {
		transition: none;
	}

	.slider-full {
		position: absolute;
		top: 0;
		left: var(--full-img-offset);
		width: calc(100cqw * var(--full-img-scale));
		height: 100%;
		object-fit: fill;
		object-position: left center;
		pointer-events: none;
		user-select: none;
	}

	.slider-thumb {
		position: absolute;
		top: 50%;
		width: var(--thumb-width);
		height: auto;
		left: calc(var(--thumb-width) * 0.5 + var(--progress) * (100% - var(--thumb-width)));
		transform: translate(-50%, -50%);
		pointer-events: none;
		user-select: none;
		transition: left 0.32s ease-in-out;
		z-index: 2;
	}

	.rounds-labels {
		margin-top: calc(var(--panel-width) * 0.012);
		width: 100%;
		pointer-events: none;
		user-select: none;
	}

	.rounds-labels-rail {
		position: relative;
		width: 100%;
		height: calc(var(--panel-width) * 0.04);
	}

	.rounds-labels-head-spacer {
		display: block;
		width: var(--track-start);
		height: 0;
	}

	.rounds-labels-track {
		position: absolute;
		left: var(--track-start);
		right: 0;
		top: 0;
		height: 100%;
	}

	.rounds-label {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.032);
		font-style: italic;
		font-weight: 700;
		color: #d4b44a;
		line-height: 1;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.85),
			0 2px 4px rgba(0, 0, 0, 0.65);
	}

	.start-section {
		position: absolute;
		top: 79%;
		left: 7%;
		right: 7%;
		height: 14%;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		box-sizing: border-box;
	}

	.start-button {
		position: relative;
		display: block;
		width: 62%;
		max-width: 100%;
		margin: 0 auto;
		aspect-ratio: 772 / 342;
		padding: 0;
		border: 0;
		background: transparent;
		cursor: pointer;
		transition:
			transform 0.12s,
			filter 0.12s,
			opacity 0.12s;
		/* Визуальный центр тёмной области main_button.png: (46+258)/2 / 342 */
		--start-button-text-y: 44.44%;

		&:hover:not(:disabled) {
			filter: brightness(1.08);
			transform: scale(1.02);
		}

		&:active:not(:disabled) {
			transform: scale(0.98);
		}

		&:disabled {
			cursor: not-allowed;
			pointer-events: none;
		}

		&.dimmed {
			opacity: 0.5;
		}
	}

	.start-button-bg {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		pointer-events: none;
		user-select: none;
	}

	.start-button-label {
		position: absolute;
		top: var(--start-button-text-y);
		left: 50%;
		transform: translate(-50%, -50%);
		margin: 0;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.038);
		font-style: italic;
		font-weight: 900;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #d4b44a;
		line-height: 1;
		white-space: nowrap;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.85),
			0 2px 6px rgba(0, 0, 0, 0.65);
		pointer-events: none;
		user-select: none;
	}

	.rounds-title {
		position: absolute;
		top: 48%;
		left: 11%;
		right: 11%;
		margin: 0;
		text-align: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.044);
		font-style: italic;
		font-weight: 900;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #d4b44a;
		line-height: 1;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.85),
			0 2px 6px rgba(0, 0, 0, 0.65);
		pointer-events: none;
		user-select: none;
	}

	.rounds-stepper {
		position: absolute;
		top: 54%;
		left: 11%;
		right: 11%;
		height: 13%;
		display: flex;
		align-items: center;
		justify-content: center;
		column-gap: calc(var(--panel-width) * 0.038);
		box-sizing: border-box;
	}

	.rounds-stepper-btn {
		width: calc(var(--panel-width) * 0.115);
		height: calc(var(--panel-width) * 0.115);
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
			filter: brightness(0.92);
		}

		&:disabled {
			cursor: not-allowed;
			pointer-events: none;
		}

		&.dimmed {
			opacity: 0.45;
		}
	}

	.rounds-stepper-value {
		margin: 0;
		min-width: calc(var(--panel-width) * 0.3);
		text-align: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.084);
		font-style: italic;
		font-weight: 900;
		letter-spacing: 0.05em;
		color: #d4b44a;
		line-height: 1.15;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.85),
			0 2px 6px rgba(0, 0, 0, 0.65);
		pointer-events: none;
		user-select: none;
	}

	/* Portrait mobile */
	.autoplay-panel.portrait:not(.popout-l):not(.popout-s) {
		--panel-width: min(360px, 94vw);

		.features-section {
			top: 31.5%;
			left: 11%;
			right: 10%;
			height: 13.5%;
			overflow: hidden;
		}

		.features-section :global(.feature-row) {
			grid-template-columns: 22% minmax(0, 1fr) auto;
			padding: 0 1.5% 0 0;
		}

		.features-section :global(.feature-row .feature-info) {
			margin-left: 0;
			gap: calc(var(--panel-width) * 0.014);
		}

		.features-section :global(.feature-row .feature-name) {
			font-size: clamp(13px, calc(var(--panel-width) * 0.048), 17px);
			letter-spacing: 0.03em;
			line-height: 1.05;
		}

		.features-section :global(.feature-row .feature-cost) {
			font-size: clamp(10px, calc(var(--panel-width) * 0.035), 13px);
			letter-spacing: 0.02em;
			line-height: 1.05;
		}

		.features-section :global(.feature-toggle) {
			width: calc(var(--panel-width) * 0.088);
			height: calc(var(--panel-width) * 0.05);
		}
	}

	/* Stake popout L — 800×450 */
	.autoplay-panel.popout-l {
		--panel-width: min(240px, 58vw);
		filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.6));
	}

	/* Stake popout S — 400×225 */
	.autoplay-panel.popout-s {
		--panel-width: min(155px, 68vw);
		filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.55));

		.panel-title {
			font-size: calc(var(--panel-width) * 0.08);
			letter-spacing: 0.05em;
		}

		.close-button {
			width: calc(var(--panel-width) * 0.135);
			height: calc(var(--panel-width) * 0.135);
		}

		.features-section :global(.feature-row .feature-name) {
			font-size: calc(var(--panel-width) * 0.052);
		}

		.features-section :global(.feature-row .feature-info) {
			gap: calc(var(--panel-width) * 0.018);
		}

		.features-section :global(.feature-cost) {
			font-size: calc(var(--panel-width) * 0.04);
		}

		.features-section :global(.feature-toggle) {
			width: calc(var(--panel-width) * 0.11);
			height: calc(var(--panel-width) * 0.06);
		}

		.slider-head {
			width: var(--head-width);
		}

		.slider-rail {
			--thumb-width: calc(var(--panel-width) * 0.052);
		}

		.rounds-section {
			--thumb-width: calc(var(--panel-width) * 0.052);
		}

		.rounds-label {
			font-size: calc(var(--panel-width) * 0.036);
		}

		.start-button {
			width: 68%;
		}

		.start-button-label {
			font-size: calc(var(--panel-width) * 0.042);
		}

		.rounds-stepper-btn {
			width: calc(var(--panel-width) * 0.125);
			height: calc(var(--panel-width) * 0.125);
		}

		.rounds-title {
			font-size: calc(var(--panel-width) * 0.048);
		}

		.rounds-stepper-value {
			font-size: calc(var(--panel-width) * 0.09);
		}
	}

	@media (max-width: 600px) {
		.autoplay-panel:not(.popout-l):not(.popout-s) {
			--panel-width: min(340px, 94vw);

			.features-section {
				top: 31.5%;
				left: 11%;
				right: 10%;
				height: 13.5%;
				overflow: hidden;
			}

			.features-section :global(.feature-row) {
				grid-template-columns: 22% minmax(0, 1fr) auto;
				padding: 0 1.5% 0 0;
			}

			.features-section :global(.feature-row .feature-info) {
				margin-left: 0;
				gap: calc(var(--panel-width) * 0.014);
			}

			.features-section :global(.feature-row .feature-name) {
				font-size: clamp(13px, calc(var(--panel-width) * 0.048), 17px);
				letter-spacing: 0.03em;
				line-height: 1.05;
			}

			.features-section :global(.feature-row .feature-cost) {
				font-size: clamp(10px, calc(var(--panel-width) * 0.035), 13px);
				letter-spacing: 0.02em;
				line-height: 1.05;
			}

			.features-section :global(.feature-toggle) {
				width: calc(var(--panel-width) * 0.088);
				height: calc(var(--panel-width) * 0.05);
			}
		}
	}

	@media (max-height: 500px) {
		.autoplay-panel:not(.popout-l):not(.popout-s):not(.portrait) {
			--panel-width: min(245px, 48vw);
		}
	}
</style>
