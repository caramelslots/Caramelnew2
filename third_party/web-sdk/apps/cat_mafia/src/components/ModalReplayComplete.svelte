<!--
	ModalReplayComplete.svelte — end-of-sequence action to replay the same event.
-->
<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { stateBet, stateModal, stateUi } from 'state-shared';
	import { getContextLayout } from 'utils-layout';

	import { getContext } from '../game/context';
	import {
		getPortraitDeviceWidth,
		getPortraitMobileTier,
		isPopoutSmallViewport,
		isPopoutViewport,
	} from '../game/constants';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const isOpen = $derived(stateModal.modal?.name === 'replayComplete');

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

	const openStartAgain = () => {
		if (!stateUi.replay?.payload) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBet.betToResume = null;
		stateBet.winBookEventAmount = 0;
		context.eventEmitter.broadcast({ type: 'winHide' });
		stateModal.modal = { name: 'betReplay' };
	};
</script>

{#if isOpen}
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
			aria-labelledby="replay-complete-title"
			data-test="replay-complete-modal"
			in:scale={{ duration: 320, easing: backOut, start: 0.88, opacity: 0 }}
			out:scale={{ duration: 200, easing: cubicOut, start: 0.95, opacity: 0 }}
		>
			<span class="replay-badge">{context.i18nDerived.replayBadge()}</span>
			<h2 id="replay-complete-title" class="replay-title">
				{context.i18nDerived.replayCompleteTitle()}
			</h2>
			<p class="disclaimer">{context.i18nDerived.replayDisclaimer()}</p>

			<button
				type="button"
				class="start-btn"
				data-test="replay-again"
				onclick={openStartAgain}
			>
				<span class="play-icon" aria-hidden="true"></span>
				{context.i18nDerived.replayAgain()}
			</button>
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
		width: min(100%, 24rem);
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
		font-size: 1.55rem;
		font-weight: 800;
		letter-spacing: 0.01em;
		line-height: 1.15;
	}

	.disclaimer {
		margin: 0;
		color: #7d8aa3;
		font-size: 0.78rem;
		line-height: 1.35;
		max-width: 20rem;
	}

	.start-btn {
		width: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		margin-top: 0.25rem;
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

	.replay-panel.portrait:not(.popout-l):not(.popout-s) {
		width: min(94vw, 26rem);
		gap: 1rem;
		padding: 1.65rem 1.3rem 1.4rem;
		border-radius: 1.25rem;

		.replay-badge {
			font-size: 0.82rem;
			padding: 0.28rem 0.88rem;
		}

		.replay-title {
			font-size: 1.95rem;
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
			max-width: 23rem;
			line-height: 1.4;
		}
	}

	.replay-panel.portrait.mobile-s:not(.popout-l):not(.popout-s) {
		width: min(94vw, 22rem);
		gap: 0.75rem;
		padding: 1.25rem 1.05rem 1.1rem;

		.replay-badge {
			font-size: 0.72rem;
			padding: 0.22rem 0.7rem;
		}

		.replay-title {
			font-size: 1.6rem;
		}

		.start-btn {
			padding: 0.9rem 0.95rem;
			font-size: 1.08rem;
			border-radius: 0.9rem;
		}

		.play-icon {
			border-width: 0.45rem 0 0.45rem 0.72rem;
		}

		.disclaimer {
			font-size: 0.8rem;
			max-width: 19rem;
		}
	}

	.replay-panel.portrait.mobile-l:not(.popout-l):not(.popout-s) {
		width: min(97vw, 32rem);
		gap: 1.25rem;
		padding: 2.1rem 1.65rem 1.75rem;
		border-radius: 1.45rem;

		.replay-badge {
			font-size: 0.95rem;
			padding: 0.36rem 1.05rem;
		}

		.replay-title {
			font-size: 2.35rem;
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
			max-width: 28rem;
			line-height: 1.4;
		}
	}

	.replay-panel.popout-l {
		width: min(88%, 14.5rem);
		gap: 0.5rem;
		padding: 0.85rem 0.75rem 0.75rem;
		border-radius: 0.85rem;

		.replay-badge {
			font-size: 0.55rem;
			padding: 0.12rem 0.5rem;
		}

		.replay-title {
			font-size: 1.1rem;
		}

		.start-btn {
			padding: 0.55rem 0.7rem;
			font-size: 0.82rem;
			border-radius: 0.6rem;
		}

		.play-icon {
			border-width: 0.32rem 0 0.32rem 0.52rem;
		}

		.disclaimer {
			font-size: 0.58rem;
			max-width: 13rem;
		}
	}

	.replay-panel.popout-s {
		width: min(92%, 14rem);
		gap: 0.48rem;
		padding: 0.75rem 0.65rem 0.65rem;
		border-radius: 0.75rem;

		.replay-badge {
			font-size: 0.55rem;
			padding: 0.12rem 0.48rem;
		}

		.replay-title {
			font-size: 1.05rem;
		}

		.start-btn {
			padding: 0.5rem 0.6rem;
			font-size: 0.78rem;
			border-radius: 0.55rem;
		}

		.play-icon {
			border-width: 0.3rem 0 0.3rem 0.5rem;
		}

		.disclaimer {
			font-size: 0.55rem;
			max-width: 12.5rem;
		}
	}
</style>
