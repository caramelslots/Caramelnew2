<!--
	CashStacksPortraitHudOverlay.svelte — нижний util-ряд portrait HUD в HTML/CSS
	(i | ☰ | balance/bet | autoplay | turbo). Чёткий рендер как у Buy Bonus panel.
-->
<script lang="ts">
	import { stateBet, stateBetDerived, stateModal, stateUi } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { PORTRAIT_UI_LAYOUT } from '../game/constants';
	import {
		computePortraitHudY,
		portraitLayoutSizeToCanvas,
		portraitLocalToCanvasX,
		portraitLocalToCanvasY,
		portraitRefXToLocal,
		portraitScaleY,
	} from '../game/portraitHudLayout';
	import { UI_BASE_SIZE } from 'components-ui-pixi/src/constants';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { getContextLayout } from 'utils-layout';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const assetBase = `${import.meta.env.BASE_URL}assets/sprites/ui`;
	const infoUrl = `${assetBase}/info/info.png`;
	const menuUrl = `${assetBase}/menu/menu.png`;
	const autoplayUrl = `${assetBase}/autoplay/autoplay_mobile.png`;
	const turboUrls = {
		1: `${assetBase}/turbo/turbo_1.png`,
		2: `${assetBase}/turbo/turbo_3.png`,
		3: `${assetBase}/turbo/turbo_2.png`,
	} as const;

	let uiVisible = $state(true);

	context.eventEmitter.subscribeOnMount({
		uiShow: () => {
			uiVisible = true;
		},
		uiHide: () => {
			uiVisible = false;
		},
	});

	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const isFreeSpins = $derived(
		stateGame.gameType === 'freegame' || stateUi.freeSpinCounterShow,
	);
	const show = $derived(
		isPortrait && !context.stateLayout.showLoadingScreen && uiVisible,
	);

	const ml = $derived(stateLayoutDerived.mainLayout());
	const btn = PORTRAIT_UI_LAYOUT.buttons;
	const spinScale = $derived(btn.spinDiam / UI_BASE_SIZE);
	const spinHalf = $derived((UI_BASE_SIZE * spinScale) / 2);
	const utilRowHalf = $derived(
		Math.max(portraitScaleY(btn.utilIconDiam, ml.height), portraitScaleY(26, ml.height)) / 2,
	);

	const hudY = $derived.by(() => {
		void stateGame.gameType;
		void stateUi.freeSpinCounterShow;
		return computePortraitHudY(stateLayoutDerived, spinHalf, utilRowHalf);
	});

	const iconLayoutSize = $derived(portraitRefXToLocal(btn.utilIconDiam, stateLayoutDerived));
	const iconCanvasSize = $derived(portraitLayoutSizeToCanvas(iconLayoutSize, stateLayoutDerived));
	const footerFontSize = $derived(portraitLayoutSizeToCanvas(20, stateLayoutDerived));

	const positions = $derived({
		info: {
			left: portraitLocalToCanvasX(portraitRefXToLocal(PORTRAIT_UI_LAYOUT.utilX.info, stateLayoutDerived), stateLayoutDerived),
			top: portraitLocalToCanvasY(hudY.utilCenterY, stateLayoutDerived),
		},
		menu: {
			left: portraitLocalToCanvasX(portraitRefXToLocal(PORTRAIT_UI_LAYOUT.utilX.menu, stateLayoutDerived), stateLayoutDerived),
			top: portraitLocalToCanvasY(hudY.utilCenterY, stateLayoutDerived),
		},
		balance: {
			left: portraitLocalToCanvasX(ml.width * 0.5, stateLayoutDerived),
			top: portraitLocalToCanvasY(hudY.utilCenterY, stateLayoutDerived),
		},
		autoplay: {
			left: portraitLocalToCanvasX(portraitRefXToLocal(PORTRAIT_UI_LAYOUT.utilX.autoplay, stateLayoutDerived), stateLayoutDerived),
			top: portraitLocalToCanvasY(hudY.utilCenterY, stateLayoutDerived),
		},
		turbo: {
			left: portraitLocalToCanvasX(portraitRefXToLocal(PORTRAIT_UI_LAYOUT.utilX.turbo, stateLayoutDerived), stateLayoutDerived),
			top: portraitLocalToCanvasY(hudY.utilCenterY, stateLayoutDerived),
		},
	});

	const balanceBetText = $derived(
		`${context.i18nDerived.balance()} ${numberToCurrencyString(stateBet.balanceAmount)}  ${context.i18nDerived.bet()} ${numberToCurrencyString(stateBet.betAmount)}`,
	);

	const turboUrl = $derived(turboUrls[stateGame.gameSpeed]);
	const turboDisabled = $derived(stateBet.isSpaceHold);

	const isAutoSpinModalOpen = $derived(stateModal.modal?.name === 'autoSpin');
	const hasAutoBetCounter = $derived(stateBetDerived.hasAutoBetCounter());
	const autoplayDisabled = $derived.by(() => {
		if (stateBet.isSpaceHold) return true;
		if (isAutoSpinModalOpen) return false;
		if (!context.stateXstateDerived.isIdle() && !hasAutoBetCounter) return true;
		if (!stateBetDerived.isBetCostAvailable()) return true;
		return false;
	});

	const onInfoPress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'gameRules' };
	};

	const onMenuPress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateUi.menuOpen = true;
	};

	const onAutoplayPress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (isAutoSpinModalOpen) {
			stateModal.modal = null;
		} else if (hasAutoBetCounter) {
			stateBet.autoSpinsCounter = 0;
		} else {
			stateModal.modal = { name: 'autoSpin' };
		}
	};

	const onTurboPress = () => {
		if (turboDisabled) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const next = (stateGame.gameSpeed === 3 ? 1 : stateGame.gameSpeed + 1) as 1 | 2 | 3;
		stateGame.gameSpeed = next;
		stateBet.isTurbo = next > 1;
	};
</script>

{#if show}
	<div class="portrait-hud-overlay" aria-label="game controls">
		<button
			type="button"
			class="hud-icon-btn"
			style:left="{positions.info.left}px"
			style:top="{positions.info.top}px"
			style:width="{iconCanvasSize}px"
			style:height="{iconCanvasSize}px"
			style:background-image="url('{infoUrl}')"
			aria-label="info"
			onclick={onInfoPress}
		></button>

		<button
			type="button"
			class="hud-icon-btn"
			style:left="{positions.menu.left}px"
			style:top="{positions.menu.top}px"
			style:width="{iconCanvasSize}px"
			style:height="{iconCanvasSize}px"
			style:background-image="url('{menuUrl}')"
			aria-label="menu"
			onclick={onMenuPress}
		></button>

		<p
			class="hud-balance-bet"
			style:left="{positions.balance.left}px"
			style:top="{positions.balance.top}px"
			style:font-size="{footerFontSize}px"
		>
			{balanceBetText}
		</p>

		{#if !isFreeSpins}
			<button
				type="button"
				class="hud-icon-btn"
				class:dimmed={autoplayDisabled && !isAutoSpinModalOpen}
				style:left="{positions.autoplay.left}px"
				style:top="{positions.autoplay.top}px"
				style:width="{iconCanvasSize}px"
				style:height="{iconCanvasSize}px"
				style:background-image="url('{autoplayUrl}')"
				disabled={autoplayDisabled}
				aria-label={context.i18nDerived.autoplayTitle()}
				onclick={onAutoplayPress}
			></button>
		{/if}

		<button
			type="button"
			class="hud-icon-btn"
			class:dimmed={turboDisabled}
			style:left="{positions.turbo.left}px"
			style:top="{positions.turbo.top}px"
			style:width="{iconCanvasSize}px"
			style:height="{iconCanvasSize}px"
			style:background-image="url('{turboUrl}')"
			disabled={turboDisabled}
			aria-label="turbo"
			onclick={onTurboPress}
		></button>
	</div>
{/if}

<style lang="scss">
	.portrait-hud-overlay {
		position: fixed;
		inset: 0;
		z-index: 44;
		pointer-events: none;
		font-family: Arial, sans-serif;
	}

	.hud-icon-btn {
		position: absolute;
		transform: translate(-50%, -50%);
		border: 0;
		padding: 0;
		background-color: transparent;
		background-repeat: no-repeat;
		background-position: center;
		background-size: contain;
		cursor: pointer;
		pointer-events: auto;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
		transition: transform 0.1s, filter 0.15s, opacity 0.15s;

		&:active:not(:disabled) {
			transform: translate(-50%, -50%) scale(0.97);
			filter: brightness(0.9);
		}

		&:disabled {
			cursor: not-allowed;
			pointer-events: none;
		}

		&.dimmed {
			opacity: 0.45;
		}
	}

	.hud-balance-bet {
		position: absolute;
		transform: translate(-50%, -50%);
		margin: 0;
		color: #fff;
		font-weight: 400;
		letter-spacing: 0.02em;
		line-height: 1.2;
		text-align: center;
		white-space: nowrap;
		pointer-events: none;
		user-select: none;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
	}
</style>
