<!--
	CashStacksBuyBonusPanel.svelte — Buy Bonus (portrait phone only).
	Non-phone layouts render Buy Bonus in CashStacksDesktopHudOverlay.
	Bonus Boost: Autoplay + Buy Bonus menu only (not on this panel).
-->
<script lang="ts">
	import { stateModal, stateUi } from 'state-shared';

	import { isFreeSpinsActive } from '../game/activeFeature';
	import {
		isPopoutViewport,
		isPopoutSmallViewport,
		resolveBuyPanelText,
	} from '../game/constants';
	import { portraitBuyPanelCanvasTop } from '../game/portraitHudLayout';
	import { portraitHudAnchors } from '../game/portraitHudAnchors.svelte';
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { HUD_ASSETS } from '../game/uiHtmlAssetManifest';
	import { getContextLayout } from 'utils-layout';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPopout = $derived(isPopoutViewport(stateLayoutDerived.canvasSizes()));
	const isPopoutSmall = $derived(isPopoutSmallViewport(stateLayoutDerived.canvasSizes()));
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
		isPortrait &&
			gameEntrance.showContent &&
			!isFreeSpinsActive() &&
			stateUi.config.mode !== 'replay',
	);

	const buyDisabled = $derived(!context.stateXstateDerived.isIdle());

	const panelStyle = $derived.by(() => {
		const top = portraitBuyPanelCanvasTop(context.stateLayoutDerived);
		return `left:50%;top:${top}px;transform:translate(-50%,0)`;
	});

	const onBuyBonusPress = () => {
		if (buyDisabled) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'buyBonus' };
	};

	const buyBonusBgUrl = HUD_ASSETS.buyBonusPanel;
	const buyBonusLabel = $derived(context.i18nDerived.buyBonusPanelButton());

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
		data-panel-text-key={panelText.key}
		aria-label="buy bonus"
		style={panelStyle}
	>
		<button
			type="button"
			class="buy-bonus-btn panel-sprite-btn"
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

		<!-- Stage A: Bonus Boost removed from main panel; remains in Autoplay + Buy Bonus menu. -->
	</aside>
{/if}

<style lang="scss">
	.buy-bonus-panel {
		position: fixed;
		z-index: 45;
		font-family: 'proxima-nova', sans-serif;
		pointer-events: auto;
	}

	.buy-bonus-panel.portrait {
		/* Same footprint as before boost removal: 2-col grid, Buy Bonus in left cell. */
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: stretch;
		gap: 0.35rem;
		width: min(76vw, 360px);
		padding: 0;
		background: transparent;
		border: none;
	}

	.buy-bonus-panel.portrait .buy-bonus-label {
		letter-spacing: 0.05em;
	}

	.buy-bonus-panel.portrait .buy-bonus-btn {
		height: auto;
		padding: 12% 10%;
	}

	.buy-bonus-btn {
		box-sizing: border-box;
		width: 100%;
		aspect-ratio: 1233 / 613;
		border: 0;
		padding: 16% 14%;
		background-color: transparent;
		background-repeat: no-repeat;
		background-position: center;
		background-size: 100% 100%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: filter 0.15s, opacity 0.15s, transform 0.1s;

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
</style>
