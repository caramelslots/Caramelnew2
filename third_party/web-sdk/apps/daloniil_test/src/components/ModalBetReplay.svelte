<!--
	ModalBetReplay.svelte — pre-start summary before a replay round begins.
	Shows Mode, Base Bet/Play, Cost/Feature Multiplier, total cost, payout/final
	multiplier, and total win/prize (Stake.us social wording via i18n).
-->
<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { stateBet, stateModal, stateUi, stateUrlDerived } from 'state-shared';
	import { numberToCurrencyString, numberToWinCurrencyString } from 'utils-shared/amount';
	import { getContextLayout } from 'utils-layout';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import {
		getPortraitDeviceWidth,
		getPortraitMobileTier,
		isPopoutSmallViewport,
		isPopoutViewport,
	} from '../game/constants';
	import {
		formatReplayMultiplier,
		getReplayModeLabel,
	} from '../game/replayModeLabel';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const isOpen = $derived(
		stateModal.modal?.name === 'betReplay' && gameEntrance.showContent,
	);
	const summary = $derived(stateUi.replay);

	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);
	const mobileTier = $derived(
		isPortrait
			? getPortraitMobileTier(
					stateLayoutDerived.canvasSizeType(),
					getPortraitDeviceWidth(canvasSizes),
				)
			: null,
	);

	const modeLabel = $derived(summary ? getReplayModeLabel(summary.modeKey) : '');

	const startReplay = () => {
		if (!summary?.payload) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });

		const mode = summary.modeKey || stateUrlDerived.mode();
		// Re-apply stake before play — wins scale from wageredBetAmount.
		stateBet.betAmount = summary.baseBet;
		stateBet.wageredBetAmount = summary.baseBet;
		// @ts-ignore — resume machine expects a bet-shaped payload
		stateBet.betToResume = {
			...(summary.payload as object),
			event: '0',
			active: true,
			mode,
		};
		if (mode) stateBet.activeBetModeKey = mode;

		stateModal.modal = null;
		context.eventEmitter.broadcast({ type: 'resumeBet' });
	};
</script>

{#if isOpen && summary}
	<div class="replay-overlay" role="presentation" transition:fade={{ duration: 180 }}>
		<div class="replay-backdrop" aria-hidden="true"></div>

		<div
			class="replay-panel"
			class:portrait={isPortrait}
			class:popout-l={isPopout}
			class:popout-s={isPopoutSmall}
			class:mobile-s={mobileTier === 'small'}
			class:mobile-m={mobileTier === 'medium'}
			class:mobile-l={mobileTier === 'large'}
			role="dialog"
			aria-modal="true"
			aria-labelledby="bet-replay-title"
			data-test="bet-replay-modal"
			in:scale={{ duration: 320, easing: backOut, start: 0.88, opacity: 0 }}
			out:scale={{ duration: 200, easing: cubicOut, start: 0.95, opacity: 0 }}
		>
			<span class="replay-badge">{context.i18nDerived.replayBadge()}</span>
			<h2 id="bet-replay-title" class="replay-title">{context.i18nDerived.replayTitle()}</h2>

			<div class="replay-card" data-test="bet-replay-summary">
				<div class="row">
					<span class="label">{context.i18nDerived.replayMode()}</span>
					<span class="value yellow mode-value">{modeLabel}</span>
				</div>
				<div class="divider"></div>

				<div class="row">
					<span class="label">{context.i18nDerived.replayBaseBet()}</span>
					<span class="value yellow">{numberToCurrencyString(summary.baseBet)}</span>
				</div>
				<div class="row">
					<span class="label">{context.i18nDerived.replayCostMultiplier()}</span>
					<span class="value yellow">{formatReplayMultiplier(summary.costMultiplier)}</span>
				</div>

				<div class="row highlight">
					<span class="label">{context.i18nDerived.replayTotalBetCost()}</span>
					<span class="value yellow strong">{numberToCurrencyString(summary.totalBetCost)}</span>
				</div>
				<div class="divider"></div>

				<div class="row">
					<span class="label">{context.i18nDerived.replayPayoutMultiplier()}</span>
					<span class="value green"
						>{formatReplayMultiplier(summary.payoutMultiplier)}</span
					>
				</div>
				<div class="row highlight">
					<span class="label">{context.i18nDerived.replayTotalWin()}</span>
					<span class="value green strong"
						>{numberToWinCurrencyString(summary.totalWin)}</span
					>
				</div>
			</div>

			<button
				type="button"
				class="start-btn"
				data-test="bet-replay-start"
				onclick={startReplay}
			>
				<span class="play-icon" aria-hidden="true"></span>
				{context.i18nDerived.replayStart()}
			</button>

			<p class="disclaimer">{context.i18nDerived.replayDisclaimer()}</p>
		</div>
	</div>
{/if}

<style lang="scss">
	.replay-overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: grid;
		place-items: center;
		padding: 1.25rem;
		pointer-events: auto;
	}

	.replay-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(4, 10, 24, 0.72);
	}

	.replay-panel {
		position: relative;
		z-index: 1;
		width: min(100%, 26rem);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.85rem;
		padding: 1.5rem 1.25rem 1.25rem;
		border-radius: 1.15rem;
		background: linear-gradient(180deg, #18263f 0%, #101828 100%);
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
		text-align: center;
	}

	.replay-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.2rem 0.72rem;
		border-radius: 999px;
		background: #f5c518;
		color: #111827;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		line-height: 1.2;
	}

	.replay-title {
		margin: 0;
		color: #ffffff;
		font-size: 1.65rem;
		font-weight: 800;
		letter-spacing: 0.01em;
		line-height: 1.15;
	}

	.replay-card {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 0.85rem 0.9rem;
		border-radius: 0.85rem;
		background: rgba(8, 14, 28, 0.55);
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		min-height: 1.35rem;
	}

	.row.highlight {
		margin: 0.1rem -0.35rem;
		padding: 0.45rem 0.35rem;
		border-radius: 0.55rem;
		background: rgba(0, 0, 0, 0.28);
	}

	.divider {
		height: 1px;
		margin: 0.15rem 0;
		background: rgba(255, 255, 255, 0.08);
	}

	.label {
		color: #8b9bb8;
		font-size: 0.92rem;
		font-weight: 500;
		text-align: left;
	}

	.value {
		font-size: 0.98rem;
		font-weight: 700;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.value.strong {
		font-size: 1.08rem;
	}

	.value.yellow {
		color: #f5c518;
	}

	.value.green {
		color: #3dd68c;
	}

	.mode-value {
		text-transform: none;
	}

	.start-btn {
		width: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		margin-top: 0.15rem;
		padding: 0.85rem 1rem;
		border: 0;
		border-radius: 0.85rem;
		background: #f5c518;
		color: #111827;
		font-size: 1.05rem;
		font-weight: 800;
		cursor: pointer;
		transition: transform 120ms ease, filter 120ms ease;

		&:hover {
			filter: brightness(1.05);
		}

		&:active {
			transform: scale(0.98);
		}
	}

	.play-icon {
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 0.42rem 0 0.42rem 0.7rem;
		border-color: transparent transparent transparent #111827;
	}

	.disclaimer {
		margin: 0.15rem 0 0;
		color: #7d8aa3;
		font-size: 0.78rem;
		line-height: 1.35;
		max-width: 22rem;
	}

	/* Portrait base (Mobile M default) */
	.replay-panel.portrait:not(.popout-l):not(.popout-s) {
		width: min(94vw, 28rem);
		gap: 1rem;
		padding: 1.65rem 1.3rem 1.4rem;
		border-radius: 1.25rem;

		.replay-badge {
			font-size: 0.82rem;
			padding: 0.28rem 0.88rem;
		}

		.replay-title {
			font-size: 2rem;
		}

		.replay-card {
			gap: 0.7rem;
			padding: 1.05rem 1.1rem;
			border-radius: 0.95rem;
		}

		.row {
			min-height: 1.4rem;
			gap: 0.8rem;
		}

		.row.highlight {
			margin: 0.1rem -0.35rem;
			padding: 0.48rem 0.4rem;
			border-radius: 0.6rem;
		}

		.label {
			font-size: 1.12rem;
		}

		.value {
			font-size: 1.2rem;
		}

		.value.strong {
			font-size: 1.32rem;
		}

		.start-btn {
			padding: 1.05rem 1.1rem;
			font-size: 1.22rem;
			border-radius: 1.05rem;
			gap: 0.55rem;
		}

		.play-icon {
			border-width: 0.5rem 0 0.5rem 0.82rem;
		}

		.disclaimer {
			font-size: 0.92rem;
			max-width: 25rem;
			line-height: 1.4;
		}
	}

	/* Mobile S (≤374px) */
	.replay-panel.portrait.mobile-s:not(.popout-l):not(.popout-s) {
		width: min(94vw, 24rem);
		gap: 0.75rem;
		padding: 1.25rem 1.05rem 1.1rem;
		border-radius: 1.1rem;

		.replay-badge {
			font-size: 0.72rem;
			padding: 0.22rem 0.7rem;
		}

		.replay-title {
			font-size: 1.65rem;
		}

		.replay-card {
			gap: 0.55rem;
			padding: 0.85rem 0.9rem;
		}

		.row {
			min-height: 1.3rem;
			gap: 0.65rem;
		}

		.row.highlight {
			padding: 0.4rem 0.35rem;
		}

		.label,
		.value {
			font-size: 0.98rem;
		}

		.value.strong {
			font-size: 1.08rem;
		}

		.start-btn {
			padding: 0.9rem 0.95rem;
			font-size: 1.08rem;
			border-radius: 0.9rem;
			gap: 0.5rem;
		}

		.play-icon {
			border-width: 0.45rem 0 0.45rem 0.72rem;
		}

		.disclaimer {
			font-size: 0.8rem;
			max-width: 21rem;
		}
	}

	/* Mobile L (≥425px) */
	.replay-panel.portrait.mobile-l:not(.popout-l):not(.popout-s) {
		width: min(97vw, 34rem);
		gap: 1.25rem;
		padding: 2.1rem 1.65rem 1.75rem;
		border-radius: 1.45rem;

		.replay-badge {
			font-size: 0.95rem;
			padding: 0.36rem 1.05rem;
		}

		.replay-title {
			font-size: 2.45rem;
		}

		.replay-card {
			gap: 0.95rem;
			padding: 1.25rem 1.3rem;
			border-radius: 1.1rem;
		}

		.row {
			min-height: 1.7rem;
			gap: 1rem;
		}

		.row.highlight {
			margin: 0.14rem -0.45rem;
			padding: 0.62rem 0.5rem;
			border-radius: 0.7rem;
		}

		.label {
			font-size: 1.28rem;
		}

		.value {
			font-size: 1.38rem;
		}

		.value.strong {
			font-size: 1.52rem;
		}

		.start-btn {
			padding: 1.25rem 1.3rem;
			font-size: 1.4rem;
			border-radius: 1.2rem;
			gap: 0.7rem;
		}

		.play-icon {
			border-width: 0.6rem 0 0.6rem 1rem;
		}

		.disclaimer {
			font-size: 1.05rem;
			max-width: 30rem;
			line-height: 1.4;
		}
	}

	/* Popout L — compact relative to the small iframe */
	.replay-panel.popout-l {
		width: min(88%, 15.5rem);
		gap: 0.5rem;
		padding: 0.85rem 0.75rem 0.75rem;
		border-radius: 0.85rem;

		.replay-badge {
			font-size: 0.55rem;
			padding: 0.12rem 0.5rem;
		}

		.replay-title {
			font-size: 1.15rem;
		}

		.replay-card {
			gap: 0.35rem;
			padding: 0.55rem 0.6rem;
			border-radius: 0.6rem;
		}

		.row {
			min-height: 1.05rem;
			gap: 0.45rem;
		}

		.row.highlight {
			margin: 0.05rem -0.2rem;
			padding: 0.28rem 0.25rem;
		}

		.label,
		.value {
			font-size: 0.72rem;
		}

		.value.strong {
			font-size: 0.8rem;
		}

		.start-btn {
			padding: 0.55rem 0.7rem;
			font-size: 0.82rem;
			border-radius: 0.6rem;
			gap: 0.35rem;
		}

		.play-icon {
			border-width: 0.32rem 0 0.32rem 0.52rem;
		}

		.disclaimer {
			font-size: 0.58rem;
			max-width: 14rem;
			line-height: 1.3;
		}
	}

	/* Popout S — bumped up for readability in 400×225 */
	.replay-panel.popout-s {
		width: min(92%, 14.5rem);
		gap: 0.48rem;
		padding: 0.75rem 0.65rem 0.65rem;
		border-radius: 0.75rem;

		.replay-badge {
			font-size: 0.55rem;
			padding: 0.12rem 0.48rem;
		}

		.replay-title {
			font-size: 1.1rem;
		}

		.replay-card {
			gap: 0.32rem;
			padding: 0.5rem 0.55rem;
			border-radius: 0.55rem;
		}

		.row {
			min-height: 1rem;
			gap: 0.35rem;
		}

		.row.highlight {
			margin: 0;
			padding: 0.24rem 0.22rem;
		}

		.divider {
			margin: 0.06rem 0;
		}

		.label,
		.value {
			font-size: 0.68rem;
		}

		.value.strong {
			font-size: 0.75rem;
		}

		.start-btn {
			padding: 0.5rem 0.6rem;
			font-size: 0.78rem;
			border-radius: 0.55rem;
			gap: 0.32rem;
		}

		.play-icon {
			border-width: 0.3rem 0 0.3rem 0.5rem;
		}

		.disclaimer {
			font-size: 0.55rem;
			max-width: 13rem;
			line-height: 1.25;
		}
	}
</style>
