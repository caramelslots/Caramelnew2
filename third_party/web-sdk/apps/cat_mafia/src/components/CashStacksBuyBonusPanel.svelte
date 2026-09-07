<!--
	CashStacksBuyBonusPanel.svelte — Buy Bonus (portrait phone only).
	Non-phone layouts render Buy Bonus in CashStacksDesktopHudOverlay.
-->
<script lang="ts">
	import { stateModal, stateUi } from 'state-shared';

	import { isLockedBonusHud } from '../game/activeFeature';
	import { BUY_BONUS_BUTTON_ASPECT } from '../game/constants';
	import {
		portraitBuyPanelCanvasCenterX,
		portraitBuyPanelCanvasTop,
		portraitBuyPanelSizeCanvas,
	} from '../game/portraitHudLayout';
	import { portraitHudAnchors } from '../game/portraitHudAnchors.svelte';
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { HUD_ASSETS } from '../game/uiHtmlAssetManifest';
	import { getContextLayout } from 'utils-layout';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const show = $derived(
		isPortrait &&
			gameEntrance.showContent &&
			!isLockedBonusHud() &&
			stateUi.config.mode !== 'replay',
	);

	const buyDisabled = $derived(!context.stateXstateDerived.isIdle());

	const panelStyle = $derived.by(() => {
		const top = portraitBuyPanelCanvasTop(stateLayoutDerived);
		const left = portraitBuyPanelCanvasCenterX(stateLayoutDerived);
		return `left:${left}px;top:${top}px;transform:translate(-50%,0)`;
	});

	const onBuyBonusPress = () => {
		if (buyDisabled) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'buyBonus' };
	};

	const buyBonusBgUrl = HUD_ASSETS.buyBonusPanel;
	const buyBonusLabel = $derived(context.i18nDerived.buyBonusPanelButton());
	const buyBonusSize = $derived(portraitBuyPanelSizeCanvas(stateLayoutDerived));
	const buyBonusHeight = $derived(buyBonusSize / BUY_BONUS_BUTTON_ASPECT);

	let panelEl = $state<HTMLElement | null>(null);

	$effect(() => {
		void stateLayoutDerived.canvasSizes();
		void stateLayoutDerived.mainLayout();

		if (!panelEl || !isPortrait || !show) {
			if (!show || !isPortrait) portraitHudAnchors.buyPanelBottom = 0;
			return;
		}

		let syncRaf = 0;
		const syncBottom = () => {
			cancelAnimationFrame(syncRaf);
			syncRaf = requestAnimationFrame(() => {
				if (!panelEl) return;
				portraitHudAnchors.buyPanelBottom = panelEl.getBoundingClientRect().bottom;
			});
		};

		syncBottom();
		const observer = new ResizeObserver(syncBottom);
		observer.observe(panelEl);
		window.addEventListener('resize', syncBottom);

		return () => {
			cancelAnimationFrame(syncRaf);
			observer.disconnect();
			window.removeEventListener('resize', syncBottom);
		};
	});
</script>

{#if show}
	<aside
		bind:this={panelEl}
		class="buy-bonus-panel daloniil-ui-enter portrait"
		data-test="buy-bonus-panel"
		aria-label="buy bonus"
		style={panelStyle}
		style:width="{buyBonusSize}px"
	>
		<button
			type="button"
			class="buy-bonus-btn"
			disabled={buyDisabled}
			onclick={onBuyBonusPress}
			data-test="buy-bonus-panel-button"
			style:width="{buyBonusSize}px"
			style:height="{buyBonusHeight}px"
			style:background-image={`url("${buyBonusBgUrl}")`}
			aria-label={buyBonusLabel}
		></button>
	</aside>
{/if}

<style lang="scss">
	.buy-bonus-panel {
		position: fixed;
		z-index: 45;
		pointer-events: auto;
	}

	.buy-bonus-panel.portrait {
		display: flex;
		justify-content: center;
		padding: 0;
		background: transparent;
		border: none;
	}

	.buy-bonus-btn {
		box-sizing: border-box;
		border: 0;
		padding: 0;
		background-color: transparent;
		background-repeat: no-repeat;
		background-position: center;
		background-size: contain;
		cursor: pointer;
		transition:
			filter 0.15s,
			opacity 0.15s,
			transform 0.1s;

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
</style>
