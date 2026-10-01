<!--
	CashStacksDesktopHudOverlay.svelte — desktop + popout L/S HUD в HTML/CSS.
	Util bar (i, ☰, balance, bet) + spin cluster (−, spin, +, autoplay, turbo).
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

	import { isPopoutViewport, isPopoutSmallViewport } from '../game/constants';
	import { computeDesktopHudLayout, resolveDesktopHudConfig } from '../game/desktopHudLayout';
	import { getRoundsCounter } from '../game/autoplay';
	import { canAffordSpin, canIncreaseBet } from '../game/buyBonusBalance';
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { HUD_ASSETS } from '../game/uiHtmlAssetManifest';
	import { stateGame } from '../game/stateGame.svelte';
	import { isSdkTurboSpin } from '../game/gameSpeed';
	import { getContextLayout } from 'utils-layout';
	import { OnHotkey } from 'components-shared';
	import { isAnyMenuOpen } from '../game/isAnyMenuOpen';

	import HudBalanceBetLine from './HudBalanceBetLine.svelte';
	import SpinHudButton from './SpinHudButton.svelte';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const infoUrl = HUD_ASSETS.info;
	const menuUrl = HUD_ASSETS.menu;
	const minusUrl = HUD_ASSETS.betMinus;
	const plusUrl = HUD_ASSETS.betPlus;
	const autoplayUrl = HUD_ASSETS.autoplay;
	const turboUrls = {
		1: HUD_ASSETS.turbo1,
		2: HUD_ASSETS.turbo2,
		3: HUD_ASSETS.turbo3,
	} as const;

	let uiVisible = $state(true);
	let stopDisabled = $state(false);
	let spinHudButton = $state<SpinHudButton | undefined>();

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
	const isPopout = $derived(isPopoutViewport(stateLayoutDerived.canvasSizes()));
	const isPopoutSmall = $derived(isPopoutSmallViewport(stateLayoutDerived.canvasSizes()));
	const useDesktopHud = $derived(layoutType !== 'portrait');
	const isFreeSpins = $derived(stateGame.gameType === 'freegame' || stateUi.freeSpinCounterShow);
	const isReplay = $derived(stateUi.config.mode === 'replay');
	const show = $derived(useDesktopHud && gameEntrance.showContent && uiVisible);
	const spinPrewarmActive = $derived(
		useDesktopHud && gameEntrance.preloadContent && uiVisible && !isFreeSpins,
	);
	const overlayMounted = $derived(show || spinPrewarmActive);

	const hudConfig = $derived(resolveDesktopHudConfig(isPopoutSmall));
	const pos = $derived(computeDesktopHudLayout(stateLayoutDerived, hudConfig));

	const isAutoSpinModalOpen = $derived(stateModal.modal?.name === 'autoSpin');
	const menuBlocksSpaceSpin = $derived(isAnyMenuOpen());
	const hasAutoBetCounter = $derived(stateBetDerived.hasAutoBetCounter());
	const hasCounter = $derived(stateBetDerived.hasAutoBetCounter());
	const spinCounterText = $derived(
		stateBet.autoSpinsCounter === Infinity ? '∞' : String(stateBet.autoSpinsCounter),
	);
	const spinCounterFontSize = $derived.by(() => {
		if (stateBet.autoSpinsCounter === Infinity) return pos.spin.size * 0.32;
		if (stateBet.autoSpinsCounter > 99) return pos.spin.size * 0.16;
		if (stateBet.autoSpinsCounter > 9) return pos.spin.size * 0.22;
		return pos.spin.size * 0.28;
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

	const smallestBet = $derived(
		stateConfig.minBet > 0 ? stateConfig.minBet : stateConfig.betAmountOptions[0],
	);
	const biggestBet = $derived(
		stateConfig.maxBet > 0
			? stateConfig.maxBet
			: stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1],
	);
	const decreaseDisabled = $derived(
		!context.stateXstateDerived.isIdle() || stateBet.betAmount === smallestBet,
	);
	const increaseDisabled = $derived(!context.stateXstateDerived.isIdle() || !canIncreaseBet());

	const autoplayDisabled = $derived.by(() => {
		if (stateBet.isSpaceHold) return true;
		if (isAutoSpinModalOpen) return false;
		if (!context.stateXstateDerived.isIdle() && !hasAutoBetCounter) return true;
		return false;
	});

	const turboDisabled = $derived(stateBet.isSpaceHold);
	const turboUrl = $derived(turboUrls[stateGame.gameSpeed]);

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
		context.eventEmitter.broadcast({ type: 'soundPressMinus' });
		const nextSmaller = [...stateConfig.betAmountOptions]
			.sort((a, b) => b - a)
			.find((option) => option < stateBet.betAmount);
		stateBetDerived.setBetAmount(nextSmaller || smallestBet);
	};

	const onIncreasePress = () => {
		if (increaseDisabled) return;
		context.eventEmitter.broadcast({ type: 'soundPressPlus' });
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
			spinHudButton?.playAnimation();
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

{#if overlayMounted}
	<div
		class="desktop-hud-overlay"
		class:daloniil-ui-enter={show}
		class:prewarm={!show}
		aria-label="game controls"
		aria-hidden={!show}
	>
		{#if show}
			<button
				type="button"
				class="hud-icon-btn"
				style:left="{pos.info.x}px"
				style:top="{pos.info.y}px"
				style:width="{pos.info.size}px"
				style:height="{pos.info.size}px"
				style:background-image="url('{infoUrl}')"
				aria-label="info"
				onclick={onInfoPress}
			></button>

			<button
				type="button"
				class="hud-icon-btn"
				style:left="{pos.menu.x}px"
				style:top="{pos.menu.y}px"
				style:width="{pos.menu.size}px"
				style:height="{pos.menu.size}px"
				style:background-image="url('{menuUrl}')"
				aria-label="menu"
				onclick={onMenuPress}
			></button>

			{#if !isReplay}
				<p
					class="hud-balance-bet"
					style:left="{pos.balance.x}px"
					style:top="{pos.balance.y}px"
					style:font-size="{pos.balance.fontSize}px"
				>
					<HudBalanceBetLine
						label={context.i18nDerived.balance()}
						value={numberToCurrencyString(stateBet.balanceAmount)}
					/>
				</p>
			{/if}
			<p
				class="hud-balance-bet"
				style:left="{pos.bet.x}px"
				style:top="{pos.bet.y}px"
				style:font-size="{pos.bet.fontSize}px"
			>
				<HudBalanceBetLine
					label={context.i18nDerived.bet()}
					value={numberToCurrencyString(stateBet.betAmount)}
				/>
			</p>

			{#if !isFreeSpins && !isReplay}
				<button
					type="button"
					class="hud-icon-btn"
					class:dimmed={decreaseDisabled}
					style:left="{pos.decrease.x}px"
					style:top="{pos.decrease.y}px"
					style:width="{pos.decrease.size}px"
					style:height="{pos.decrease.size}px"
					style:background-image="url('{minusUrl}')"
					disabled={decreaseDisabled}
					aria-label={context.i18nDerived.ariaDecreaseAmount()}
					onclick={onDecreasePress}
				></button>

				<button
					type="button"
					class="hud-icon-btn"
					class:dimmed={increaseDisabled}
					style:left="{pos.increase.x}px"
					style:top="{pos.increase.y}px"
					style:width="{pos.increase.size}px"
					style:height="{pos.increase.size}px"
					style:background-image="url('{plusUrl}')"
					disabled={increaseDisabled}
					aria-label={context.i18nDerived.ariaIncreaseAmount()}
					onclick={onIncreasePress}
				></button>

				<button
					type="button"
					class="hud-pill-btn"
					class:dimmed={autoplayDisabled && !isAutoSpinModalOpen}
					style:left="{pos.autoplay.x}px"
					style:top="{pos.autoplay.y}px"
					style:width="{pos.autoplay.width}px"
					style:height="{pos.autoplay.height}px"
					style:background-image="url('{autoplayUrl}')"
					disabled={autoplayDisabled}
					aria-label={context.i18nDerived.autoplayTitle()}
					onclick={onAutoplayPress}
				>
					<span class="hud-pill-label" style:font-size="{pos.autoplay.fontSize}px">
						{context.i18nDerived.autoplayTitle()}
					</span>
				</button>
			{/if}

			<button
				type="button"
				class="hud-icon-btn"
				class:dimmed={turboDisabled}
				style:left="{pos.turbo.x}px"
				style:top="{pos.turbo.y}px"
				style:width="{pos.turbo.size}px"
				style:height="{pos.turbo.size}px"
				style:background-image="url('{turboUrl}')"
				disabled={turboDisabled}
				aria-label="turbo"
				onclick={onTurboPress}
			></button>
		{/if}

		{#if !isFreeSpins && !isReplay}
			<OnHotkey
				hotkey="Space"
				disabled={spinDisabled || !show || menuBlocksSpaceSpin}
				onpress={onSpinPress}
			/>
			<SpinHudButton
				bind:this={spinHudButton}
				x={pos.spin.x}
				y={pos.spin.y}
				size={pos.spin.size}
				dimmed={spinDisabled}
				disabled={spinDisabled || !show}
				onpress={onSpinPress}
				{hasCounter}
				counterText={spinCounterText}
				counterFontSize={spinCounterFontSize}
			/>
		{/if}
	</div>
{/if}

<style lang="scss">
	.desktop-hud-overlay {
		position: fixed;
		inset: 0;
		z-index: 44;
		pointer-events: none;

		&.prewarm {
			visibility: hidden;
		}
	}

	.hud-icon-btn,
	.hud-pill-btn {
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
		transition:
			transform 0.1s,
			filter 0.15s,
			opacity 0.15s;

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

	.hud-pill-btn {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hud-pill-label {
		color: #fff;
		font-family: 'proxima-nova', Arial, sans-serif;
		font-weight: 600;
		line-height: 1;
		text-align: center;
		pointer-events: none;
		user-select: none;
	}

	.hud-balance-bet {
		position: absolute;
		transform: translate(0, -50%);
		margin: 0;
		text-align: left;
		pointer-events: none;
		user-select: none;
	}
</style>
