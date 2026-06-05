<!--
	CashStacksBuyBonusPanel.svelte — Buy Bonus + Bonus Boost.
	Desktop: слева от доски (вертикальный блок).
	Portrait (Popup S): под WIN, два столбца в ряд (ref. IMAGE 2026-06-02 13:11:58).
-->
<script lang="ts">
	import { stateModal } from 'state-shared';

	import CashStacksFeatureToggles from './CashStacksFeatureToggles.svelte';
	import { isFreeSpinsActive } from '../game/activeFeature';
	import { BOARD_LAYOUT_OFFSETS, BOARD_SIZES } from '../game/constants';
	import { portraitBuyPanelCanvasTop } from '../game/portraitHudLayout';
	import { getContext } from '../game/context';
	import { getContextLayout } from 'utils-layout';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();
	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isDesktop = $derived(layoutType === 'desktop');
	const isPortrait = $derived(layoutType === 'portrait');
	const show = $derived(
		(isDesktop || isPortrait) &&
			!context.stateLayout.showLoadingScreen &&
			!isFreeSpinsActive(),
	);

	const buyDisabled = $derived(!context.stateXstateDerived.isIdle());

	const PANEL_GAP = 12;
	const PANEL_W = 210;
	const PANEL_SHIFT_LEFT = 36;
	const desktopPanelPos = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const off = BOARD_LAYOUT_OFFSETS.desktop;
		const boardCenterX = ml.x + off.x * ml.scale;
		const boardCenterY = ml.y + off.y * ml.scale;
		const halfW = (BOARD_SIZES.width / 2) * ml.scale;
		return {
			left: boardCenterX - halfW - PANEL_GAP - PANEL_W - PANEL_SHIFT_LEFT,
			top: boardCenterY,
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
</script>

{#if show}
	<aside
		class="buy-bonus-panel"
		class:portrait={isPortrait}
		class:desktop={isDesktop}
		data-test="buy-bonus-panel"
		aria-label="buy bonus"
		style={panelStyle}
	>
		<button
			type="button"
			class="buy-bonus-btn"
			disabled={buyDisabled}
			onclick={onBuyBonusPress}
			data-test="buy-bonus-panel-button"
		>
			{context.i18nDerived.buyBonusPanelButton()}
		</button>

		<div class="boost-section">
			<CashStacksFeatureToggles features={['bonus_boost']} />
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
		gap: 0.55rem;
		width: min(210px, 72vw);
		padding: 0.65rem 0.55rem;
		background: rgba(20, 20, 20, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 14px;
	}

	.buy-bonus-panel.portrait {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.35rem;
		width: min(84vw, 420px);
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 0;
	}

	.portrait .buy-bonus-btn {
		min-height: 50px;
		padding: 0.45rem 0.4rem;
		font-size: 0.82rem;
		text-transform: uppercase;
		background: rgba(0, 0, 0, 0.35);
		border-radius: 10px;
	}

	.buy-bonus-btn {
		width: 100%;
		padding: 0.7rem 0.85rem;
		border: 0;
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.35);
		color: #fff;
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 700;
		line-height: 1.2;
		text-align: center;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;

		&:hover:not(:disabled) {
			background: rgba(0, 0, 0, 0.48);
		}

		&:disabled {
			opacity: 0.45;
			cursor: not-allowed;
			pointer-events: none;
		}
	}

	.boost-section {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		justify-content: center;
	}

	.desktop .boost-section {
		padding-top: 0.15rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	/* Portrait boost — тот же вид, что desktop (название + cost + toggle). */
	.portrait .boost-section :global(.feature-row) {
		min-height: 50px;
		padding: 0.4rem 0.45rem;
	}

	.portrait .boost-section :global(.feature-name) {
		font-size: 0.85rem;
	}

	.portrait .boost-section :global(.feature-cost) {
		font-size: 0.72rem;
	}
</style>
