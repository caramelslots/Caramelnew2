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
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { prepareBuyBonusMenu } from '../game/buyBonusSharedPixi';
	import { isPhoneForAtlasDownscale } from '../game/phoneSpineAtlasDownscale';
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

	let opening = $state(false);

	const onBuyBonusPress = () => {
		if (buyDisabled || opening) return;
		opening = true;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		void (async () => {
			try {
				if (
					isPhoneForAtlasDownscale() &&
					gameEntrance.buyBonusWarmReady &&
					gameEntrance.postLiftAssetsReady
				) {
					stateModal.modal = { name: 'buyBonus' };
					return;
				}
				await prepareBuyBonusMenu();
				stateModal.modal = { name: 'buyBonus' };
			} finally {
				opening = false;
			}
		})();
	};

	const buyBonusBgUrl = HUD_ASSETS.buyBonusPanel;
	const buyBonusLabel = $derived(context.i18nDerived.buyBonusPanelButton());
	const buyBonusSize = $derived(portraitBuyPanelSizeCanvas(stateLayoutDerived));
	const buyBonusHeight = $derived(buyBonusSize / BUY_BONUS_BUTTON_ASPECT);
</script>

{#if show}
	<aside
		class="buy-bonus-panel daloniil-ui-enter portrait"
		class:in-lift={!gameEntrance.liftComplete}
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
		>
			<span class="buy-bonus-hit" aria-hidden="true"></span>
		</button>
	</aside>
{/if}

<style lang="scss">
	.buy-bonus-panel {
		position: fixed;
		z-index: 45;
		pointer-events: auto;

		&.in-lift {
			position: absolute;
		}
	}

	.buy-bonus-panel.portrait {
		display: flex;
		justify-content: center;
		padding: 0;
		background: transparent;
		border: none;
	}

	.buy-bonus-btn {
		position: relative;
		display: block;
		box-sizing: border-box;
		border: 0;
		padding: 0;
		background-color: transparent;
		background-repeat: no-repeat;
		background-position: center;
		background-size: 100% 100%;
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

	.buy-bonus-hit {
		position: absolute;
		inset: 0;
		display: block;
	}
</style>
