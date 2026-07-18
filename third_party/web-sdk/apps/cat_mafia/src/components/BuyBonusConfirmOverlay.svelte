<!--
	BuyBonusConfirmOverlay.svelte — подтверждение покупки бонуса (WOK MENU).
	bg_buy_bonus_confirm_panel + cancel/confirm button bg; карточка, cross — как в BuyBonusOverlay.
-->
<script lang="ts">
	import { stateModal, stateBet, stateI18n } from 'state-shared';
	import { stateBonus } from 'components-ui-html/src/stateBonus.svelte';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { getContextLayout } from 'utils-layout';

	import { clearActiveFeature } from '../game/activeFeature';
	import {
		buyNormalCostMultiplier,
		buySuperCostMultiplier,
		canAffordBuyBonus,
	} from '../game/buyBonusBalance';
	import { isPopoutSmallViewport, isPopoutViewport, HUD_BALANCE_BET_FONT_FAMILY, isLatinScriptLocale } from '../game/constants';
	import { ensureKnewaveFontLoaded } from '../game/knewaveFont';
	import { getContext } from '../game/context';
	import { AUTOSPIN_ASSETS, BUY_BONUS_ASSETS } from '../game/uiHtmlAssetManifest';
	import FitCardText from './FitCardText.svelte';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const locale = $derived(stateI18n.i18n.locale);
	const useLatinKnewave = $derived(isLatinScriptLocale(locale));
	let knewaveFontReady = $state(false);

	const bgUrl = BUY_BONUS_ASSETS.confirmBg;
	const normalCardUrl = BUY_BONUS_ASSETS.normalCard;
	const superCardUrl = BUY_BONUS_ASSETS.superCard;
	const closeIconUrl = AUTOSPIN_ASSETS.close;
	const cancelButtonBgUrl = BUY_BONUS_ASSETS.cancelButtonBg;
	const confirmButtonBgUrl = BUY_BONUS_ASSETS.confirmButtonBg;
	const deskLUrl = BUY_BONUS_ASSETS.deskL;
	const deskRUrl = BUY_BONUS_ASSETS.deskR;

	const isOpen = $derived(stateModal.modal?.name === 'buyBonusConfirm');

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

	const isSuper = $derived(stateBonus.selectedBetModeKey === 'bonus_super');
	const multiplier = $derived(isSuper ? buySuperCostMultiplier() : buyNormalCostMultiplier());
	const cardUrl = $derived(isSuper ? superCardUrl : normalCardUrl);
	const deskUrl = $derived(isSuper ? deskRUrl : deskLUrl);
	const price = $derived(numberToCurrencyString(stateBet.betAmount * multiplier));
	const canConfirm = $derived(canAffordBuyBonus(multiplier));

	const cardTitle = $derived(
		isSuper ? context.i18nDerived.superBonus() : context.i18nDerived.normalBonus(),
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

<div
	class="confirm-panel"
	class:portrait={isPortrait}
	class:popout-l={isPopout}
	class:popout-s={isPopoutSmall}
	role="dialog"
	aria-modal="true"
	aria-hidden={!isOpen}
	data-test="buy-bonus-confirm-overlay"
>
	<img class="panel-bg" src={bgUrl} alt="" draggable="false" loading="eager" />

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

		<p class="panel-subtitle" data-test="buy-bonus-title">{context.i18nDerived.buyBonusTitle()}</p>

		<section class="confirm-card-section" aria-label="selected bonus">
			<article class="card confirm-card" class:card-normal={!isSuper} class:card-super={isSuper}>
				<img class="card-bg" src={cardUrl} alt="" draggable="false" />
				<div class="card-content">
					<div class="card-title" class:card-label-knewave={showKnewaveLabels}>{cardTitle}</div>
					{#if isSuper}
						<div class="card-desc card-desc-stacked">
							<span class="desc-spin-count" class:card-count-knewave={knewaveFontReady}>{context.i18nDerived.buySuperDescCount()}</span>
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
					{:else}
						<div class="card-desc card-desc-stacked">
							<span class="desc-spin-count" class:card-count-knewave={knewaveFontReady}>{context.i18nDerived.buyNormalDescCount()}</span>
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
					{/if}
					<div class="card-price-wrap" style:background-image="url('{deskUrl}')">
						<span class="card-price" data-test="buy-bonus-confirm-price">{price}</span>
					</div>
				</div>
			</article>
		</section>

		<footer class="confirm-actions">
			<button
				type="button"
				class="action-btn cancel-btn"
				style:background-image="url('{cancelButtonBgUrl}')"
				onclick={goBack}
				data-test="buy-bonus-confirm-back"
			>
				{context.i18nDerived.buyCancel()}
			</button>
			<button
				type="button"
				class="action-btn confirm-btn"
				style:background-image="url('{confirmButtonBgUrl}')"
				disabled={!canConfirm}
				onclick={confirm}
				data-test="confirm-button"
			>
				{context.i18nDerived.buyConfirm()}
			</button>
		</footer>
	</div>
</div>

<style lang="scss">
	@use './buyBonusPanelDimensions.scss' as *;
	@import url('https://fonts.googleapis.com/css2?family=Philosopher:wght@700&family=Reggae+One&display=swap');

	.confirm-panel {
		// Declarations before mixin: mixin ends with @media nests (mixed-decls).
		--bb-card-price-fs: calc(var(--panel-width) * 0.024);
		--bb-confirm-action-fs: calc(var(--panel-width) * 0.020);
		font-family: v-bind(HUD_BALANCE_BET_FONT_FAMILY);
		position: relative;
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

	.confirm-card-section {
		position: absolute;
		top: 25%;
		left: 49%;
		width: 79%;
		height: 52%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
	}

	.confirm-card-section .card {
		position: relative;
		height: 100%;
		width: auto;
		flex: 0 0 auto;
		filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45));
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
		transform: scale(0.8);
		transform-origin: 50% 61%;
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
		margin: 0;
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
		--bb-desc-count-fs: calc(var(--panel-width) * 0.066);
		--bb-desc-count-stroke: calc(var(--bb-desc-count-fs) * 0.092);
		--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.024);
		--bb-desc-spin-label-stroke: calc(var(--bb-desc-spin-label-fs) * 0.092);
		--bb-desc-trigger-fs: calc(var(--panel-width) * 0.014);
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

	.card-normal .card-desc.card-desc-stacked .desc-spin-count {
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
			0 calc(var(--bb-desc-count-fs) * 0.07) calc(var(--bb-desc-count-fs) * 0.1)
				rgba(0, 0, 0, 0.66),
			0 0 calc(var(--bb-desc-count-fs) * 0.12) rgba(255, 228, 185, 0.38);
	}

	.card-normal .card-desc.card-desc-stacked .desc-spin-count.card-count-knewave {
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
			0 calc(var(--bb-desc-count-fs) * 0.07) calc(var(--bb-desc-count-fs) * 0.1)
				rgba(0, 0, 0, 0.66);
	}

	.card .card-desc.card-desc-stacked :global(.fit-card-text__inner) {
		color: inherit;
		display: inline-block;
		paint-order: stroke fill;
		-webkit-font-smoothing: antialiased;
	}

	.card-normal .card-desc.card-desc-stacked :global(.fit-card-text__inner.desc-spin-label) {
		-webkit-text-stroke: var(--bb-desc-spin-label-stroke) rgba(255, 244, 225, 0.96);
		text-shadow:
			0 calc(var(--bb-desc-spin-label-fs) * 0.03) 0 rgba(72, 42, 18, 0.62),
			0 calc(var(--bb-desc-spin-label-fs) * 0.055) calc(var(--bb-desc-spin-label-fs) * 0.09)
				rgba(0, 0, 0, 0.38),
			0 0 calc(var(--bb-desc-spin-label-fs) * 0.12) rgba(255, 228, 185, 0.42);
	}

	.card-normal .card-desc.card-desc-stacked :global(.fit-card-text__inner.desc-trigger) {
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

	.card-normal .card-desc.card-desc-stacked :global(.fit-card-text--knewave .fit-card-text__inner.desc-spin-label) {
		-webkit-text-stroke: calc(var(--bb-desc-spin-label-fs) * var(--bb-knewave-count-stroke-weight))
			rgba(255, 244, 225, 0.96);
		text-shadow:
			0 calc(var(--bb-desc-spin-label-fs) * 0.03) 0 rgba(72, 42, 18, 0.62),
			0 calc(var(--bb-desc-spin-label-fs) * 0.055) calc(var(--bb-desc-spin-label-fs) * 0.09)
				rgba(0, 0, 0, 0.38);
	}

	.card-normal .card-desc.card-desc-stacked :global(.fit-card-text--knewave .fit-card-text__inner.desc-trigger) {
		-webkit-text-stroke: calc(var(--bb-desc-trigger-fs) * var(--bb-knewave-count-stroke-weight))
			rgba(255, 244, 225, 0.96);
		text-shadow:
			0 calc(var(--bb-desc-trigger-fs) * 0.03) 0 rgba(72, 42, 18, 0.62),
			0 calc(var(--bb-desc-trigger-fs) * 0.055) calc(var(--bb-desc-trigger-fs) * 0.09)
				rgba(0, 0, 0, 0.38);
	}

	.card-super .card-desc.card-desc-stacked :global(.fit-card-text--knewave .fit-card-text__inner.desc-spin-label) {
		-webkit-text-stroke: calc(var(--bb-desc-spin-label-fs) * var(--bb-knewave-count-stroke-weight))
			rgba(45, 12, 6, 0.94);
		text-shadow:
			0 calc(var(--bb-desc-spin-label-fs) * 0.04) 0 rgba(0, 0, 0, 0.82),
			0 calc(var(--bb-desc-spin-label-fs) * 0.07) calc(var(--bb-desc-spin-label-fs) * 0.1)
				rgba(0, 0, 0, 0.66);
	}

	.card-super .card-desc.card-desc-stacked :global(.fit-card-text--knewave .fit-card-text__inner.desc-trigger) {
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
		top: 99%;
		left: 50%;
		transform: translateX(-50%);
		width: 110%;
		height: 18%;
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

	.card-normal .card-price {
		color: #f5e6c8;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
	}

	.card-super .card-price {
		color: #f5e6c8;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
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
		gap: calc(var(--panel-width) * 0.07);
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
		font-family: inherit;
		font-size: var(--bb-confirm-action-fs);
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

	.cancel-btn,
	.confirm-btn {
		flex: 0 1 auto;
		width: auto;
		max-width: 48%;
		aspect-ratio: 343 / 165;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--bb-confirm-action-fs);
		line-height: 1;
		color: #f5e6c8;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
	}

	/* Desktop */
	.confirm-panel:not(.portrait):not(.popout-l):not(.popout-s) {
		--bb-card-price-fs: calc(var(--panel-width) * 0.028);
		--bb-confirm-action-fs: calc(var(--panel-width) * 0.021);

		.close-button {
			width: calc(var(--panel-width) * 0.085);
			height: calc(var(--panel-width) * 0.085);
			margin-top: calc(var(--panel-width) * 0.06);
			margin-right: calc(var(--panel-width) * 0.03);
		}

		.confirm-card-section {
			top: 25%;
			left: 49%;
			width: 79%;
			height: 52%;
		}

		.panel-subtitle {
			font-size: calc(var(--panel-width) * 0.026);
			line-height: 1.08;
		}

		.card {
			height: 100%;
		}

		.card-content {
			transform: scale(0.8);
			transform-origin: 50% 61%;
		}

		.card-super .card-desc.card-desc-stacked {
			--bb-desc-count-fs: calc(var(--panel-width) * 0.079);
			--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.031);
			--bb-desc-trigger-fs: calc(var(--panel-width) * 0.020);
		}

		.card-normal .card-desc.card-desc-stacked {
			--bb-desc-count-fs: calc(var(--panel-width) * 0.079);
			--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.031);
			--bb-desc-trigger-fs: calc(var(--panel-width) * 0.020);
		}

		.card-price-wrap {
			top: 99%;
			height: 18%;
			width: 110%;
		}

		.confirm-actions {
			top: 83%;
			left: 18%;
			right: 18%;
			height: 9%;
		}
	}

	/* Portrait */
	.confirm-panel.portrait:not(.popout-l):not(.popout-s) {
		--bb-card-price-fs: calc(var(--panel-width) * 0.036);
		--bb-confirm-action-fs: calc(var(--panel-width) * 0.028);

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
			top: 35%;
			right: 7%;
			width: calc(var(--panel-width) * 0.095);
			height: calc(var(--panel-width) * 0.095);
			margin: 0;
		}

		.confirm-card-section {
			top: 25%;
			left: 49%;
			width: 79%;
			height: 46%;
		}

		.panel-subtitle {
			font-size: calc(var(--panel-width) * 0.036);
			line-height: 1.08;
		}

		.card {
			height: 100%;
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
			--bb-desc-count-fs: calc(var(--panel-width) * 0.103);
			--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.041);
			--bb-desc-trigger-fs: calc(var(--panel-width) * 0.023);
		}

		.card-price-wrap {
			top: 105%;
			height: 18%;
			width: 118%;
		}

		.confirm-actions {
			top: 81%;
			left: 14%;
			right: 14%;
			height: 10%;
			gap: calc(var(--panel-width) * 0.08);
		}
	}

	/* Popout L */
	.confirm-panel.popout-l {
		filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.6));
		--bb-card-price-fs: calc(var(--panel-width) * 0.028);
		--bb-confirm-action-fs: calc(var(--panel-width) * 0.024);

		.close-button {
			width: calc(var(--panel-width) * 0.085);
			height: calc(var(--panel-width) * 0.085);
			margin-top: calc(var(--panel-width) * 0.06);
			margin-right: calc(var(--panel-width) * 0.03);
		}

		.confirm-card-section {
			top: 25%;
			left: 49%;
			width: 79%;
			height: 52%;
		}

		.panel-subtitle {
			font-size: calc(var(--panel-width) * 0.026);
			line-height: 1.08;
		}

		.card {
			height: 100%;
		}

		.card-content {
			transform: scale(0.8);
			transform-origin: 50% 61%;
		}

		.card .card-desc.card-desc-stacked {
			height: 18%;
			--bb-desc-count-fs: calc(var(--panel-width) * 0.079);
			--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.030);
			--bb-desc-trigger-fs: calc(var(--panel-width) * 0.018);
		}

		.card-price-wrap {
			top: 99%;
			height: 18%;
			width: 110%;
		}

		.confirm-actions {
			top: 82%;
			height: 10%;
		}
	}

	/* Popout S */
	.confirm-panel.popout-s {
		filter: drop-shadow(
			0 calc(var(--panel-width) * 0.025) calc(var(--panel-width) * 0.075) rgba(0, 0, 0, 0.55)
		);
		--bb-card-price-fs: calc(var(--panel-width) * 0.028);
		--bb-confirm-action-fs: calc(var(--panel-width) * 0.024);

		.close-button {
			width: calc(var(--panel-width) * 0.085);
			height: calc(var(--panel-width) * 0.085);
			margin-top: calc(var(--panel-width) * 0.06);
			margin-right: calc(var(--panel-width) * 0.03);
		}

		.confirm-card-section {
			top: 25%;
			left: 49%;
			width: 79%;
			height: 52%;
		}

		.panel-subtitle {
			font-size: calc(var(--panel-width) * 0.026);
			line-height: 1.08;
		}

		.card {
			height: 100%;
		}

		.card-content {
			transform: scale(0.8);
			transform-origin: 50% 61%;
		}

		.card .card-desc.card-desc-stacked {
			height: 18%;
			--bb-desc-count-fs: calc(var(--panel-width) * 0.068);
			--bb-desc-spin-label-fs: calc(var(--panel-width) * 0.025);
			--bb-desc-trigger-fs: calc(var(--panel-width) * 0.014);
		}

		.card-price-wrap {
			top: 99%;
			height: 18%;
			width: 110%;
		}

		.confirm-actions {
			top: 83%;
			left: 18%;
			right: 18%;
			height: 9%;
		}
	}

	@media (max-width: 600px) {
		.confirm-panel.portrait:not(.popout-l):not(.popout-s) {
			.confirm-card-section {
				height: 49%;
			}

			.confirm-actions {
				height: 9.7%;
			}
		}
	}
</style>
