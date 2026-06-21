<!--
	CashStacksPortraitHudOverlay.svelte — portrait HUD в HTML/CSS:
	− | Spin | + под buy/boost; i | ☰ | balance/bet | autoplay | turbo у низа экрана.
-->
<script lang="ts">
	import {
		stateBet,
		stateBetDerived,
		stateConfig,
		stateModal,
		stateUi,
		AUTO_SPINS_LOSS_LIMIT_MULTIPLIER_MAP,
		AUTO_SPINS_SINGLE_WIN_LIMIT_MULTIPLIER_MAP,
	} from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { computePortraitHudCanvas } from '../game/portraitHudLayout';
	import { portraitHudAnchors } from '../game/portraitHudAnchors.svelte';
	import { getRoundsCounter } from '../game/autoplay';
	import { canAffordSpin, canIncreaseBet } from '../game/buyBonusBalance';
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { HUD_ASSETS } from '../game/uiHtmlAssetManifest';
	import { stateGame } from '../game/stateGame.svelte';
	import { isSdkTurboSpin } from '../game/gameSpeed';
	import { getContextLayout } from 'utils-layout';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const infoUrl = HUD_ASSETS.info;
	const menuUrl = HUD_ASSETS.menu;
	const minusUrl = HUD_ASSETS.betMinus;
	const plusUrl = HUD_ASSETS.betPlus;
	const spin1Url = HUD_ASSETS.spin1;
	const spin2Url = HUD_ASSETS.spin2;
	const autoplayUrl = HUD_ASSETS.autoplayMobile;
	const turboUrls = {
		1: HUD_ASSETS.turbo1,
		2: HUD_ASSETS.turbo2,
		3: HUD_ASSETS.turbo3,
	} as const;

	let uiVisible = $state(true);
	let stopDisabled = $state(false);

	context.eventEmitter.subscribeOnMount({
		uiShow: () => {
			uiVisible = true;
		},
		uiHide: () => {
			uiVisible = false;
		},
		stopButtonClick: () => {
			stopDisabled = true;
		},
		stopButtonEnable: () => {
			stopDisabled = false;
		},
	});

	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const isFreeSpins = $derived(
		stateGame.gameType === 'freegame' || stateUi.freeSpinCounterShow,
	);
	const show = $derived(isPortrait && gameEntrance.showContent && uiVisible);

	const hud = $derived.by(() => {
		void stateGame.gameType;
		void stateUi.freeSpinCounterShow;
		void portraitHudAnchors.buyPanelBottom;
		const buyPanelBottomCanvas =
			portraitHudAnchors.buyPanelBottom > 0 ? portraitHudAnchors.buyPanelBottom : undefined;
		return computePortraitHudCanvas(stateLayoutDerived, {
			buyPanelBottomCanvas,
			hideAutoplay: isFreeSpins,
		});
	});

	const balanceLine = $derived(
		`${context.i18nDerived.balance()} ${numberToCurrencyString(stateBet.balanceAmount)}`,
	);
	const betLine = $derived(
		`${context.i18nDerived.bet()} ${numberToCurrencyString(stateBet.betAmount)}`,
	);

	let balanceWrapEl = $state<HTMLDivElement | null>(null);
	let balanceFontSize = $state(16);

	$effect(() => {
		const el = balanceWrapEl;
		if (!el) return;

		const maxWidth = hud.util.balance.maxWidth;
		let size = hud.util.fontSize;
		void balanceLine;
		void betLine;
		void maxWidth;

		const measure = (fontSize: number) => {
			el.style.fontSize = `${fontSize}px`;
			return el.scrollWidth;
		};

		while (size > 9 && measure(size) > maxWidth) {
			size -= 0.5;
		}

		balanceFontSize = size;
	});

	const turboUrl = $derived(turboUrls[stateGame.gameSpeed]);
	const turboDisabled = $derived(stateBet.isSpaceHold);

	const isAutoSpinModalOpen = $derived(stateModal.modal?.name === 'autoSpin');
	const hasAutoBetCounter = $derived(stateBetDerived.hasAutoBetCounter());
	const hasCounter = $derived(stateBetDerived.hasAutoBetCounter());
	const spinSpriteUrl = $derived(hasCounter ? spin2Url : spin1Url);

	const spinCounterText = $derived(
		stateBet.autoSpinsCounter === Infinity ? '∞' : String(stateBet.autoSpinsCounter),
	);
	const spinCounterFontSize = $derived.by(() => {
		if (stateBet.autoSpinsCounter === Infinity) return hud.spin.size * 0.32;
		if (stateBet.autoSpinsCounter > 99) return hud.spin.size * 0.16;
		if (stateBet.autoSpinsCounter > 9) return hud.spin.size * 0.22;
		return hud.spin.size * 0.28;
	});

	const betKey = $derived.by(() => {
		if (context.stateXstateDerived.isIdle()) {
			if (!canAffordSpin()) return 'spin_disabled';
			return 'spin_default';
		}
		if (stopDisabled) return 'stop_disabled';
		if (stateBetDerived.hasAutoBetCounter()) return 'stop_default';
		if (stateBet.isTurbo) return 'stop_disabled';
		return 'stop_default';
	});

	const spinDisabled = $derived.by(() => {
		if (isAutoSpinModalOpen) return !canAffordSpin();
		if (context.stateXstateDerived.isIdle()) return !canAffordSpin();
		if (hasAutoBetCounter) return betKey === 'stop_disabled';
		return true;
	});

	const smallestBet = $derived(stateConfig.betAmountOptions[0]);
	const biggestBet = $derived(
		stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1],
	);
	const decreaseDisabled = $derived(
		!context.stateXstateDerived.isIdle() || stateBet.betAmount === smallestBet,
	);
	const increaseDisabled = $derived(
		!context.stateXstateDerived.isIdle() || !canIncreaseBet(),
	);

	const autoplayDisabled = $derived.by(() => {
		if (stateBet.isSpaceHold) return true;
		if (isAutoSpinModalOpen) return false;
		if (!context.stateXstateDerived.isIdle() && !hasAutoBetCounter) return true;
		return false;
	});

	const onInfoPress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'gameRules' };
	};

	const onMenuPress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateUi.menuOpen = !stateUi.menuOpen;
	};

	const onDecreasePress = () => {
		if (decreaseDisabled) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const nextSmaller = [...stateConfig.betAmountOptions]
			.sort((a, b) => b - a)
			.find((option) => option < stateBet.betAmount);
		stateBetDerived.setBetAmount(nextSmaller || smallestBet);
	};

	const onIncreasePress = () => {
		if (increaseDisabled) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const nextBigger = [...stateConfig.betAmountOptions]
			.sort((a, b) => a - b)
			.find((option) => option > stateBet.betAmount);
		stateBetDerived.setBetAmount(nextBigger || biggestBet);
	};

	const onSpinPress = () => {
		if (spinDisabled) return;
		if (isAutoSpinModalOpen) {
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
			return;
		}

		context.eventEmitter.broadcast({ type: 'soundPressBet' });
		if (context.stateXstateDerived.isIdle()) {
			if (stateBetDerived.activeBetMode()?.type === 'buy') stateBet.activeBetModeKey = 'BASE';
			context.eventEmitter.broadcast({ type: 'bet' });
		} else if (!stopDisabled) {
			if (stateBetDerived.hasAutoBetCounter()) stateBet.autoSpinsCounter = 0;
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
		}
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
		stateBet.isTurbo = isSdkTurboSpin(next);
	};
</script>

{#if show}
	<div class="portrait-hud-overlay daloniil-ui-enter" aria-label="game controls">
		{#if !isFreeSpins}
			<button
				type="button"
				class="hud-icon-btn"
				class:dimmed={decreaseDisabled}
				style:left="{hud.spin.centerX - hud.spin.betControlOffsetX}px"
				style:top="{hud.spin.centerY}px"
				style:width="{hud.spin.smallSize}px"
				style:height="{hud.spin.smallSize}px"
				style:background-image="url('{minusUrl}')"
				disabled={decreaseDisabled}
				aria-label="decrease bet"
				onclick={onDecreasePress}
			></button>

			<button
				type="button"
				class="hud-icon-btn spin-btn"
				class:dimmed={spinDisabled}
				style:left="{hud.spin.centerX}px"
				style:top="{hud.spin.centerY + hud.spin.raiseY}px"
				style:width="{hud.spin.size}px"
				style:height="{hud.spin.size}px"
				style:background-image="url('{spinSpriteUrl}')"
				disabled={spinDisabled}
				aria-label="spin"
				onclick={onSpinPress}
			>
				{#if hasCounter}
					<span class="spin-counter" style:font-size="{spinCounterFontSize}px">{spinCounterText}</span>
				{/if}
			</button>

			<button
				type="button"
				class="hud-icon-btn"
				class:dimmed={increaseDisabled}
				style:left="{hud.spin.centerX + hud.spin.betControlOffsetX}px"
				style:top="{hud.spin.centerY}px"
				style:width="{hud.spin.smallSize}px"
				style:height="{hud.spin.smallSize}px"
				style:background-image="url('{plusUrl}')"
				disabled={increaseDisabled}
				aria-label="increase bet"
				onclick={onIncreasePress}
			></button>
		{/if}

		<button
			type="button"
			class="hud-icon-btn"
			style:left="{hud.util.x.info}px"
			style:top="{hud.util.centerY}px"
			style:width="{hud.util.iconSize}px"
			style:height="{hud.util.iconSize}px"
			style:background-image="url('{infoUrl}')"
			aria-label="info"
			onclick={onInfoPress}
		></button>

		<button
			type="button"
			class="hud-icon-btn"
			style:left="{hud.util.x.menu}px"
			style:top="{hud.util.centerY}px"
			style:width="{hud.util.iconSize}px"
			style:height="{hud.util.iconSize}px"
			style:background-image="url('{menuUrl}')"
			aria-label="menu"
			onclick={onMenuPress}
		></button>

		<div
			bind:this={balanceWrapEl}
			class="hud-balance-bet"
			style:left="{hud.util.balance.centerX}px"
			style:top="{hud.util.centerY}px"
			style:font-size="{balanceFontSize}px"
			style:max-width="{hud.util.balance.maxWidth}px"
		>
			<span class="hud-balance-bet-line">{balanceLine}</span>
			<span class="hud-balance-bet-line">{betLine}</span>
		</div>

		{#if !isFreeSpins}
			<button
				type="button"
				class="hud-icon-btn"
				class:dimmed={autoplayDisabled && !isAutoSpinModalOpen}
				style:left="{hud.util.x.autoplay}px"
				style:top="{hud.util.centerY}px"
				style:width="{hud.util.iconSize}px"
				style:height="{hud.util.iconSize}px"
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
			style:left="{hud.util.x.turbo}px"
			style:top="{hud.util.centerY}px"
			style:width="{hud.util.iconSize}px"
			style:height="{hud.util.iconSize}px"
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

	.spin-btn {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.spin-counter {
		color: #fff;
		font-weight: 800;
		line-height: 1;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
		pointer-events: none;
		user-select: none;
	}

	.hud-balance-bet {
		position: absolute;
		transform: translate(-50%, -50%);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1em;
		margin: 0;
		padding: 0;
		color: #fff;
		font-weight: 400;
		letter-spacing: 0.02em;
		text-align: center;
		pointer-events: none;
		user-select: none;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
	}

	.hud-balance-bet-line {
		white-space: nowrap;
		line-height: 1.1;
	}
</style>
