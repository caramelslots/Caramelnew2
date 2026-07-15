<!--
	ModalReplayComplete.svelte — end-of-sequence action to replay the same event.
-->
<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { stateBet, stateModal, stateUi } from 'state-shared';
	import { getContextLayout } from 'utils-layout';

	import { getContext } from '../game/context';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const isOpen = $derived(stateModal.modal?.name === 'replayComplete');

	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);

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

	.replay-panel.portrait {
		width: min(100%, 20rem);
	}

	.replay-panel.popout-s {
		width: min(100%, 17rem);

		.replay-title {
			font-size: 1.3rem;
		}
	}
</style>
