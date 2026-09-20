<!--
	BuyBonusConfirmOverlay.svelte — подтверждение покупки на той же доске,
	что и BuyBonusOverlay (bg_buy_bonus_board.webp).
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { stateModal, stateBet } from 'state-shared';
	import { stateBonus } from 'components-ui-html/src/stateBonus.svelte';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import { getContextLayout } from 'utils-layout';

	import { clearActiveFeature } from '../game/activeFeature';
	import {
		buyNormalCostMultiplier,
		buySuperCostMultiplier,
		canAffordBuyBonus,
	} from '../game/buyBonusBalance';
	import { isPopoutSmallViewport, isPopoutViewport, HUD_BALANCE_BET_FONT_FAMILY } from '../game/constants';
	import { ensureKnewaveFontLoaded } from '../game/knewaveFont';
	import { getContext } from '../game/context';
	import { evictBuyBonusForFeature } from '../game/buyBonusSharedPixi';
	import { AUTOSPIN_ASSETS, BUY_BONUS_ASSETS, startFsCongPreload } from '../game/uiHtmlAssetManifest';
	import ArchedRibbonTitle from './ArchedRibbonTitle.svelte';
	import BuyBonusCardSpine from './BuyBonusCardSpine.svelte';
	import FitCardText from './FitCardText.svelte';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	let knewaveFontReady = $state(false);

	const bgUrl = BUY_BONUS_ASSETS.menuBg;
	const closeIconUrl = AUTOSPIN_ASSETS.close;
	const cancelButtonBgUrl = BUY_BONUS_ASSETS.cancelButtonBg;
	const confirmButtonBgUrl = BUY_BONUS_ASSETS.confirmButtonBg;

	const isOpen = $derived(stateModal.modal?.name === 'buyBonusConfirm');
	let spinesMounted = $state(false);

	$effect(() => {
		if (isOpen) spinesMounted = true;
	});

	$effect(() => {
		let cancelled = false;
		void ensureKnewaveFontLoaded().then(() => {
			if (!cancelled) knewaveFontReady = true;
		});
		return () => {
			cancelled = true;
		};
	});

	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);

	const isSuper = $derived(stateBonus.selectedBetModeKey === 'bonus_super');

	const multiplier = $derived(
		isSuper ? buySuperCostMultiplier() : buyNormalCostMultiplier(),
	);
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

	const confirm = async () => {
		if (!canAffordBuyBonus(multiplier)) return;
		clearActiveFeature();
		const modeKey = stateBonus.selectedBetModeKey;
		stateModal.modal = null;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		void startFsCongPreload();
		await tick();
		await evictBuyBonusForFeature();
		stateBet.activeBetModeKey = modeKey;
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

		<p class="panel-subtitle" data-test="buy-bonus-title" hidden>
			{context.i18nDerived.buyBonusTitle()}
		</p>

		<section class="confirm-card-section" data-buy-bonus-spine-layer aria-label="selected bonus">
			<article class="card confirm-card" class:card-normal={!isSuper} class:card-super={isSuper}>
				<div class="spine-layer" class:on={!isSuper}>
					{#if spinesMounted}
						<BuyBonusCardSpine variant="normal" active={isOpen && !isSuper} />
					{/if}
				</div>
				<div class="spine-layer" class:on={isSuper}>
					{#if spinesMounted}
						<BuyBonusCardSpine variant="super" active={isOpen && isSuper} />
					{/if}
				</div>
				<div class="card-content">
					<div class="card-title">
						<ArchedRibbonTitle text={cardTitle} archDeg={isSuper ? 30 : 34} />
					</div>
					<div class="card-desc card-desc-stacked">
						<span class="desc-spin-count" class:card-count-knewave={knewaveFontReady}
							>{isSuper
								? context.i18nDerived.buySuperDescCount()
								: context.i18nDerived.buyNormalDescCount()}</span
						>
						<FitCardText
							variant="spin-label"
							text={isSuper
								? context.i18nDerived.buySuperDescSpins()
								: context.i18nDerived.buyNormalDescSpins()}
							maxLines={2}
						/>
					</div>
					<div class="card-price-wrap">
						<span
							class="card-price"
							data-test="buy-bonus-confirm-price"
							x-apple-data-detectors="false">{price}</span
						>
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
		--bb-card-price-fs: calc(var(--panel-width) * 0.042);
		--bb-confirm-action-fs: calc(var(--panel-width) * 0.028);
		--bb-title-tracking: 1.2;
		font-family: v-bind(HUD_BALANCE_BET_FONT_FAMILY);
		position: relative;
		z-index: 10;
		pointer-events: auto;
		@include buy-bonus-panel-dimensions(true);
	}

	.panel-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
		filter: drop-shadow(0 16px 42px rgba(0, 0, 0, 0.65));
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
		height: 12%;
		display: block;
		padding: 0;
		box-sizing: border-box;
		pointer-events: none;
	}

	.close-button {
		position: absolute;
		top: 45%;
		right: -1.2%;
		width: calc(var(--panel-width) * 0.115);
		height: calc(var(--panel-width) * 0.115);
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
		pointer-events: none;
		user-select: none;
	}

	.panel-subtitle {
		display: none;
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
		top: 10.5%;
		left: 50%;
		width: 66%;
		height: 70%;
		transform: translateX(-50%);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		box-sizing: border-box;

		:global(.buy-bonus-shared-spine-canvas) {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
			z-index: 0;
			/* No CSS filter — filters on transparent WebGL canvases re-composite
			   alpha incorrectly and make opaque Spine layers look see-through. */
		}
	}

	.confirm-card-section .card {
		position: relative;
		z-index: 1;
		width: 100%;
		height: auto;
		flex: 0 0 auto;
		overflow: visible;
	}

	.spine-layer {
		position: absolute;
		inset: 0;
		opacity: 0;
		pointer-events: none;

		&.on {
			opacity: 1;
		}
	}

	.card-normal,
	.card-super {
		aspect-ratio: 2325 / 3322;
		container-type: inline-size;
		container-name: bonus-card;
		--bb-card-price-fs: 8.9cqw;
	}

	.card-content {
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
	}

	.card-title {
		position: absolute;
		top: 1.2%;
		left: 4.5%;
		right: 4.5%;
		height: 16%;
		margin: 0;
		--bb-card-title-fs: calc(var(--panel-width) * 0.037);
		font-size: var(--bb-card-title-fs);
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
		top: 56%;
		left: 10%;
		right: 10%;
		height: 16%;
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
		top: 66.5%;
		left: 8%;
		right: 8%;
		height: 16%;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		--bb-desc-count-fs: 20.5cqw;
		--bb-desc-count-stroke: calc(var(--bb-desc-count-fs) * 0.08);
		--bb-desc-spin-label-fs: 9.1cqw;
		--bb-desc-spin-label-stroke: calc(var(--bb-desc-spin-label-fs) * 0.08);
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
	.card-super .card-desc.card-desc-stacked .desc-spin-count {
		-webkit-text-stroke: var(--bb-desc-count-stroke) rgba(48, 22, 6, 0.92);
		text-shadow:
			0 calc(var(--bb-desc-count-fs) * 0.04) 0 rgba(48, 22, 6, 0.75),
			0 calc(var(--bb-desc-count-fs) * 0.07) calc(var(--bb-desc-count-fs) * 0.1) rgba(0, 0, 0, 0.5);
	}

	.card-normal .card-desc.card-desc-stacked .desc-spin-count.card-count-knewave,
	.card-super .card-desc.card-desc-stacked .desc-spin-count.card-count-knewave {
		-webkit-text-stroke: calc(var(--bb-desc-count-fs) * var(--bb-knewave-count-stroke-weight))
			rgba(48, 22, 6, 0.94);
		text-shadow:
			0 calc(var(--bb-desc-count-fs) * 0.04) 0 rgba(48, 22, 6, 0.75),
			0 calc(var(--bb-desc-count-fs) * 0.07) calc(var(--bb-desc-count-fs) * 0.1) rgba(0, 0, 0, 0.5);
	}

	.card .card-desc.card-desc-stacked :global(.fit-card-text__inner) {
		color: inherit;
		display: inline-block;
		paint-order: stroke fill;
		-webkit-font-smoothing: antialiased;
	}

	.card-normal .card-desc.card-desc-stacked :global(.fit-card-text__inner.desc-spin-label),
	.card-super .card-desc.card-desc-stacked :global(.fit-card-text__inner.desc-spin-label) {
		-webkit-text-stroke: var(--bb-desc-spin-label-stroke) rgba(48, 22, 6, 0.92);
		text-shadow:
			0 calc(var(--bb-desc-spin-label-fs) * 0.04) 0 rgba(48, 22, 6, 0.75),
			0 calc(var(--bb-desc-spin-label-fs) * 0.07) calc(var(--bb-desc-spin-label-fs) * 0.1)
				rgba(0, 0, 0, 0.5);
	}

	.card-normal
		.card-desc.card-desc-stacked
		:global(.fit-card-text--knewave .fit-card-text__inner.desc-spin-label),
	.card-super
		.card-desc.card-desc-stacked
		:global(.fit-card-text--knewave .fit-card-text__inner.desc-spin-label) {
		-webkit-text-stroke: calc(var(--bb-desc-spin-label-fs) * var(--bb-knewave-count-stroke-weight))
			rgba(48, 22, 6, 0.94);
		text-shadow:
			0 calc(var(--bb-desc-spin-label-fs) * 0.04) 0 rgba(48, 22, 6, 0.75),
			0 calc(var(--bb-desc-spin-label-fs) * 0.07) calc(var(--bb-desc-spin-label-fs) * 0.1)
				rgba(0, 0, 0, 0.5);
	}

	.card .card-desc.card-desc-stacked :global(.fit-card-text--spin-label) {
		margin: 0 0 var(--bb-desc-gap-label-trigger);
	}

	.card-normal .card-desc,
	.card-super .card-desc {
		color: #f3d27a;
		text-shadow:
			0 2px 0 rgba(58, 28, 8, 0.88),
			0 3px 8px rgba(0, 0, 0, 0.55);
	}

	.card-price-wrap {
		position: absolute;
		left: 14%;
		right: 14%;
		bottom: 1.5%;
		width: auto;
		height: 12.5%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		box-sizing: border-box;
		transform: none;
	}

	.card-price {
		font-family: inherit;
		font-size: var(--bb-card-price-fs);
		font-weight: 900;
		letter-spacing: 0;
		text-align: center;
		line-height: 1;
		display: block;
		width: auto;
		color: #1a1208;
		-webkit-text-fill-color: #1a1208;
		text-shadow: 0 1px 0 rgba(255, 236, 190, 0.45);
		text-decoration: none;
		transform: translate(0.14em, 0.14em);
	}

	.card-price :global(a) {
		color: inherit;
		-webkit-text-fill-color: inherit;
		text-decoration: none;
	}

	.confirm-actions {
		position: absolute;
		top: 80%;
		left: 12%;
		right: 12%;
		height: 11%;
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
		--bb-card-price-fs: calc(var(--panel-width) * 0.048);
		--bb-confirm-action-fs: calc(var(--panel-width) * 0.026);

		.close-button {
			width: calc(var(--panel-width) * 0.112);
			height: calc(var(--panel-width) * 0.112);
		}

		.confirm-card-section {
			top: 10.5%;
			left: 50%;
			width: 66%;
			height: 70%;
		}

		.card-price-wrap {
			left: 14%;
			right: 14%;
			bottom: 1.5%;
			height: 12.5%;
			width: auto;
			transform: none;
		}

		.confirm-actions {
			top: 80%;
			left: 12%;
			right: 12%;
			height: 11%;
		}
	}

	/* Portrait */
	.confirm-panel.portrait:not(.popout-l):not(.popout-s) {
		--bb-card-price-fs: calc(var(--panel-width) * 0.058);
		--bb-confirm-action-fs: calc(var(--panel-width) * 0.032);

		.panel-bg {
			width: 100%;
			top: 0;
			bottom: 0;
			left: 0;
			right: 0;
			transform: none;
		}

		.close-button {
			position: absolute;
			top: 45%;
			right: -1.2%;
			width: calc(var(--panel-width) * 0.116);
			height: calc(var(--panel-width) * 0.116);
			margin: 0;
		}

		.confirm-card-section {
			top: 10.5%;
			left: 50%;
			width: 66%;
			height: 70%;
		}

		.card-price-wrap {
			left: 14%;
			right: 14%;
			bottom: 1.5%;
			height: 12.5%;
			width: auto;
			transform: none;
		}

		.confirm-actions {
			top: 80%;
			left: 10%;
			right: 10%;
			height: 11%;
			gap: calc(var(--panel-width) * 0.06);
		}
	}

	/* Popout L */
	.confirm-panel.popout-l {
		filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.6));
		--bb-card-price-fs: calc(var(--panel-width) * 0.048);
		--bb-confirm-action-fs: calc(var(--panel-width) * 0.026);

		.close-button {
			width: calc(var(--panel-width) * 0.112);
			height: calc(var(--panel-width) * 0.112);
		}

		.confirm-card-section {
			top: 10.5%;
			left: 50%;
			width: 66%;
			height: 70%;
		}

		.card-price-wrap {
			left: 14%;
			right: 14%;
			bottom: 1.5%;
			height: 12.5%;
			width: auto;
			transform: none;
		}

		.confirm-actions {
			top: 80%;
			height: 11%;
		}
	}

	/* Popout S */
	.confirm-panel.popout-s {
		filter: drop-shadow(
			0 calc(var(--panel-width) * 0.025) calc(var(--panel-width) * 0.075) rgba(0, 0, 0, 0.55)
		);
		--bb-card-price-fs: calc(var(--panel-width) * 0.048);
		--bb-confirm-action-fs: calc(var(--panel-width) * 0.026);

		.close-button {
			width: calc(var(--panel-width) * 0.112);
			height: calc(var(--panel-width) * 0.112);
		}

		.confirm-card-section {
			top: 10.5%;
			left: 50%;
			width: 66%;
			height: 70%;
		}

		.card-price-wrap {
			left: 14%;
			right: 14%;
			bottom: 1.5%;
			height: 12.5%;
			width: auto;
			transform: none;
		}

		.confirm-actions {
			top: 80%;
			left: 12%;
			right: 12%;
			height: 11%;
		}
	}

	@media (max-width: 600px) {
		.confirm-panel:not(.portrait):not(.popout-l):not(.popout-s) {
			.confirm-card-section {
				top: 10%;
				width: 60%;
				height: 68%;
			}

			.confirm-actions {
				top: 78%;
				height: 12%;
			}
		}

		.confirm-panel.portrait:not(.popout-l):not(.popout-s) {
			.confirm-card-section {
				top: 10%;
				width: 66%;
				height: 68%;
			}

			.confirm-actions {
				top: 78%;
				height: 12%;
			}
		}
	}
</style>
