<!--
	CashStacksBuyBonusPanel.svelte — Buy Bonus + Bonus Boost.
	Desktop: слева от доски (вертикальный блок).
	Portrait (mobile): под WIN, два столбца в ряд (ref. IMAGE 2026-06-02 13:11:58).
	Popout S/L — тот же блок что desktop (слева от доски).
-->
<script lang="ts">
	import { stateModal } from 'state-shared';

	import CashStacksFeatureToggles from './CashStacksFeatureToggles.svelte';
	import { isFreeSpinsActive } from '../game/activeFeature';
	import {
		BOARD_LAYOUT_OFFSETS,
		BOARD_SIZES,
		isPopoutViewport,
		isPopoutSmallViewport,
		resolveBuyPanelText,
	} from '../game/constants';
	import { portraitBuyPanelCanvasTop } from '../game/portraitHudLayout';
	import { getContext } from '../game/context';
	import { getContextLayout } from 'utils-layout';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPopout = $derived(isPopoutViewport(stateLayoutDerived.canvasSizes()));
	const isPopoutSmall = $derived(isPopoutSmallViewport(stateLayoutDerived.canvasSizes()));
	const isDesktop = $derived(layoutType === 'desktop' || isPopout);
	const isPortrait = $derived(layoutType === 'portrait');
	const panelText = $derived.by(() => {
		const { width, height } = stateLayoutDerived.canvasSizes();
		return resolveBuyPanelText({
			layoutType,
			isPopout,
			isPopoutSmall,
			deviceWidth: Math.min(width, height),
			canvasSizeType: stateLayoutDerived.canvasSizeType(),
		});
	});
	const show = $derived(
		(isDesktop || isPortrait) &&
			!context.stateLayout.showLoadingScreen &&
			!isFreeSpinsActive(),
	);

	const buyDisabled = $derived(!context.stateXstateDerived.isIdle());

	const panelLayout = $derived.by(() => {
		if (isPopoutSmall) {
			return { width: 70, gap: 2, shiftLeft: 12, shiftUp: 28 };
		}
		if (isPopout) {
			return { width: 124, gap: 4, shiftLeft: 22, shiftUp: 34 };
		}
		return { width: 178, gap: 8, shiftLeft: 50, shiftUp: 40 };
	});
	const desktopPanelPos = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const off = BOARD_LAYOUT_OFFSETS.desktop;
		const boardCenterX = ml.x + off.x * ml.scale;
		const boardCenterY = ml.y + off.y * ml.scale;
		const halfW = (BOARD_SIZES.width / 2) * ml.scale;
		const { width, gap, shiftLeft, shiftUp } = panelLayout;
		return {
			left: boardCenterX - halfW - gap - width - shiftLeft,
			top: boardCenterY - shiftUp,
		};
	});

	const portraitPanelStyle = $derived.by(() => {
		const top = portraitBuyPanelCanvasTop(context.stateLayoutDerived);
		return `left:50%;top:${top}px;transform:translate(-50%,0)`;
	});

	const desktopPanelStyle = $derived.by(() => {
		const pos = desktopPanelPos;
		return `left:${pos.left}px;top:${pos.top}px`;
	});

	const panelStyle = $derived(isPortrait ? portraitPanelStyle : desktopPanelStyle);

	const onBuyBonusPress = () => {
		if (buyDisabled) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'buyBonus' };
	};

	const buyBonusBgUrl = `${import.meta.env.BASE_URL}assets/sprites/ui/buy_bonus/buy_bonus.png`;
	const buyBonusLabel = $derived(context.i18nDerived.buyBonusPanelButton());
</script>

{#if show}
	<aside
		class="buy-bonus-panel"
		class:portrait={isPortrait}
		class:desktop={isDesktop}
		class:popout-l={isPopout && !isPopoutSmall}
		class:popout-s={isPopoutSmall}
		data-test="buy-bonus-panel"
		data-panel-text-key={panelText.key}
		aria-label="buy bonus"
		style={panelStyle}
	>
		<button
			type="button"
			class="buy-bonus-btn"
			disabled={buyDisabled}
			onclick={onBuyBonusPress}
			data-test="buy-bonus-panel-button"
			style:background-image={`url("${buyBonusBgUrl}")`}
			aria-label={buyBonusLabel}
		>
			<span
				class="buy-bonus-label"
				style:font-size={panelText.buyBonus}
			>{buyBonusLabel}</span>
		</button>

		<div class="boost-section">
			<CashStacksFeatureToggles
				features={['bonus_boost']}
				compact={false}
				usePanelBg
				panelNameFontSize={panelText.boostName}
				panelCostFontSize={panelText.boostCost}
			/>
		</div>
	</aside>
{/if}

<style lang="scss">
	.buy-bonus-panel {
		position: fixed;
		z-index: 45;
		font-family: 'proxima-nova', sans-serif;
		pointer-events: auto;
	}

	.buy-bonus-panel.desktop {
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		gap: 0.42rem;
		width: min(178px, 65vw);
		padding: 0.5rem 0.42rem;
		background: rgba(20, 20, 20, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 12px;
	}

	.buy-bonus-panel.desktop.popout-l {
		width: min(124px, 28vw);
		gap: 0.3rem;
		padding: 0.34rem 0.28rem;
		border-radius: 9px;
	}

	.buy-bonus-panel.desktop.popout-s {
		width: min(70px, 17vw);
		gap: 0.12rem;
		padding: 0.14rem 0.1rem;
		border-radius: 5px;
	}

	.popout-l .buy-bonus-label {
		letter-spacing: 0.04em;
	}

	.popout-l .boost-section :global(.feature-row.panel-bg .feature-name) {
		line-height: 1.15;
	}

	.popout-l .boost-section :global(.feature-row.panel-bg .feature-cost) {
		line-height: 1.1;
	}

	.popout-l .boost-section :global(.feature-row.panel-bg) {
		padding: 0 10%;
		gap: 0.35rem;
	}

	.popout-l .boost-section :global(.feature-toggle) {
		width: 30px;
		height: 17px;
	}

	.popout-l .boost-section :global(.feature-toggle .knob) {
		width: 13px;
		height: 13px;
		top: 2px;
		left: 2px;
	}

	.popout-l .boost-section :global(.feature-toggle.on .knob) {
		left: 15px;
	}

	.popout-l .buy-bonus-btn {
		padding: 14% 12%;
	}

	.popout-s .buy-bonus-btn {
		padding: 12% 10%;
	}

	.popout-s .buy-bonus-label {
		letter-spacing: 0.01em;
		line-height: 1.05;
	}

	.popout-s .boost-section {
		padding-top: 0;
	}

	.popout-s .boost-section :global(.feature-row.panel-bg) {
		padding: 0 8%;
		gap: 0.12rem;
		align-items: center;
	}

	.popout-s .boost-section :global(.feature-info) {
		gap: 0.5px;
		min-width: 0;
	}

	.popout-s .boost-section :global(.feature-row.panel-bg .feature-name) {
		line-height: 1.05;
		letter-spacing: 0;
	}

	.buy-bonus-panel.popout-s .boost-section :global(.feature-row.panel-bg .feature-cost) {
		line-height: 1.1;
		letter-spacing: 0;
		white-space: nowrap;
	}

	.buy-bonus-panel.popout-s .boost-section :global(.feature-toggle) {
		width: 14px;
		height: 8px;
		flex-shrink: 0;
		align-self: center;
	}

	.buy-bonus-panel.popout-s .boost-section :global(.feature-toggle .knob) {
		width: 5px;
		height: 5px;
		top: 1.5px;
		left: 1.5px;
	}

	.buy-bonus-panel.popout-s .boost-section :global(.feature-toggle.on .knob) {
		left: 7.5px;
	}

	.buy-bonus-panel.portrait {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: stretch;
		gap: 0.35rem;
		width: min(76vw, 360px);
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 0;
	}

	.buy-bonus-panel.portrait .buy-bonus-label {
		letter-spacing: 0.05em;
	}

	.buy-bonus-panel.portrait .buy-bonus-btn {
		height: auto;
		padding: 12% 10%;
	}

	.buy-bonus-panel.portrait .boost-section {
		width: 100%;
		min-width: 0;
		align-self: stretch;
	}

	.buy-bonus-btn {
		width: 100%;
		aspect-ratio: 1233 / 613;
		border: 0;
		padding: 16% 14%;
		box-sizing: border-box;
		background-color: transparent;
		background-repeat: no-repeat;
		background-position: center;
		background-size: 100% 100%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: filter 0.15s, opacity 0.15s, transform 0.1s;

		&:hover:not(:disabled) {
			filter: brightness(1.08);
		}

		&:active:not(:disabled) {
			transform: scale(0.97);
			filter: brightness(0.9);
		}

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
			pointer-events: none;
		}
	}

	.buy-bonus-label {
		color: #fff;
		font-family: inherit;
		font-weight: 800;
		line-height: 1.1;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		text-shadow:
			0 0 10px rgba(255, 120, 220, 0.75),
			0 2px 6px rgba(0, 0, 0, 0.85);
		pointer-events: none;
		user-select: none;
	}

	.boost-section {
		display: flex;
		flex-direction: column;
		gap: 0.42rem;
		justify-content: center;
	}

	.buy-bonus-panel.portrait .boost-section {
		gap: 0;
		justify-content: stretch;
	}

	.desktop:not(.popout-l):not(.popout-s) .boost-section :global(.feature-toggle) {
		width: 32px;
		height: 18px;
	}

	.desktop:not(.popout-l):not(.popout-s) .boost-section :global(.feature-toggle .knob) {
		width: 14px;
		height: 14px;
	}

	.desktop:not(.popout-l):not(.popout-s) .boost-section :global(.feature-toggle.on .knob) {
		left: 16px;
	}

	.buy-bonus-panel.portrait .boost-section :global(.feature-row.panel-bg) {
		width: 100%;
		height: auto;
		flex: 1;
		padding: 12% 10%;
		gap: 0.2rem;
		align-items: center;
	}

	.buy-bonus-panel.portrait .boost-section :global(.feature-row.panel-bg .feature-name) {
		line-height: 1.1;
	}

	.buy-bonus-panel.portrait .boost-section :global(.feature-row.panel-bg .feature-cost) {
		line-height: 1.05;
	}

	.buy-bonus-panel.portrait .boost-section :global(.feature-info) {
		gap: 0.12rem;
		justify-content: center;
	}

	.buy-bonus-panel.portrait .boost-section :global(.feature-toggle) {
		width: 26px;
		height: 15px;
		flex-shrink: 0;
	}

	.buy-bonus-panel.portrait .boost-section :global(.feature-toggle .knob) {
		width: 11px;
		height: 11px;
		top: 2px;
		left: 2px;
	}

	.buy-bonus-panel.portrait .boost-section :global(.feature-toggle.on .knob) {
		left: 13px;
	}
</style>
