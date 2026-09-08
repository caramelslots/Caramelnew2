<!--
	AutoplayMessageOverlay.svelte — сообщение об остановке автоигры (недостаток средств и др.).
	fsCong board (fs_bg + fs_frame, без fs_rays). OK — fs_board.webp (узкая).
-->
<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { stateModal } from 'state-shared';
	import { getContextLayout } from 'utils-layout';

	import assets from '../game/assets';
	import { getContext } from '../game/context';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const bgUrl = assets.fsCongBg.src;
	const frameUrl = assets.fsCongFrame.src;
	const boardUrl = assets.fsCongBoard.src;

	type AutoSpinMessageKey = 'insufficientFunds' | 'lossLimitReached' | 'singleWinLimitReached';

	const messageMap = $derived<Record<AutoSpinMessageKey, { title: string; body: string }>>({
		insufficientFunds: {
			title: context.i18nDerived.autoplayMessageInsufficientFundsTitle(),
			body: context.i18nDerived.autoplayMessageInsufficientFundsBody(),
		},
		lossLimitReached: {
			title: context.i18nDerived.autoplayMessageLossLimitTitle(),
			body: context.i18nDerived.autoplayMessageLossLimitBody(),
		},
		singleWinLimitReached: {
			title: context.i18nDerived.autoplayMessageSingleWinLimitTitle(),
			body: context.i18nDerived.autoplayMessageSingleWinLimitBody(),
		},
	});

	const isOpen = $derived(stateModal.modal?.name === 'autoSpinMessage');
	const messageKey = $derived(
		stateModal.modal?.name === 'autoSpinMessage' ? stateModal.modal.message : 'insufficientFunds',
	);
	const copy = $derived(messageMap[messageKey]);

	const layoutType = $derived(stateLayoutDerived.layoutType());
	const isPortrait = $derived(layoutType === 'portrait');
	const canvasSizes = $derived(stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);

	const close = () => {
		stateModal.modal = null;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};
</script>

<svelte:window
	onkeydown={(e) => {
		if (isOpen && e.key === 'Escape') close();
	}}
/>

{#if isOpen}
	<div class="message-overlay" class:portrait={isPortrait} role="presentation" transition:fade={{ duration: 180 }}>
		<button class="message-backdrop" type="button" aria-label="close" onclick={close}></button>

		<div
			class="message-panel"
			class:portrait={isPortrait}
			class:popout-l={isPopout}
			class:popout-s={isPopoutSmall}
			role="dialog"
			aria-modal="true"
			data-test="autoplay-message-overlay"
			in:scale={{ duration: 320, easing: backOut, start: 0.88, opacity: 0 }}
			out:scale={{ duration: 200, easing: cubicOut, start: 0.95, opacity: 0 }}
		>
			<img class="layer layer-bg" src={bgUrl} alt="" draggable="false" loading="eager" />
			<img class="layer layer-frame" src={frameUrl} alt="" draggable="false" loading="eager" />

			<div class="panel-content">
				<div class="content-safe">
					<h2 class="message-title" data-test="auto-spin-stop-content">{copy.title}</h2>
					<p class="message-text" aria-live="polite">{copy.body}</p>
				</div>

				<button type="button" class="ok-btn" onclick={close} data-test="autoplay-message-ok">
					<img class="ok-btn-bg" src={boardUrl} alt="" draggable="false" />
					<span class="ok-btn-label">{context.i18nDerived.autoplayMessageOk()}</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.message-overlay {
		position: fixed;
		inset: 0;
		z-index: 9998;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px;
		box-sizing: border-box;
		background: rgba(0, 0, 0, 0.55);
		pointer-events: auto;

		&.portrait {
			padding: 0;
			overflow: visible;
		}
	}

	.message-backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		padding: 0;
		margin: 0;
		background: transparent;
		cursor: default;
		-webkit-tap-highlight-color: transparent;
	}

	.message-panel {
		--panel-width: min(860px, 98vw);
		--ok-btn-bottom: 34%;
		position: relative;
		width: var(--panel-width);
		aspect-ratio: calc(2000 / 1500);
		max-height: 96vh;
		pointer-events: auto;
		filter: drop-shadow(0 20px 50px rgba(0, 0, 0, 0.75));
		z-index: 1;
	}

	.layer {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		user-select: none;
		pointer-events: none;
	}

	.layer-bg {
		z-index: 0;
	}

	.layer-frame {
		z-index: 1;
	}

	.panel-content {
		position: absolute;
		inset: 0;
		z-index: 2;
	}

	/* Safe zone inside gold frame — tuned to 2000×1500 fsCong artboard. */
	.content-safe {
		position: absolute;
		top: 28%;
		left: 21%;
		right: 21%;
		bottom: 23%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: calc(var(--panel-width) * 0.018);
		box-sizing: border-box;
	}

	.message-title {
		margin: calc(var(--panel-width) * 0.004) 0 0;
		width: 100%;
		padding-top: 0;
		text-align: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.042);
		font-weight: 800;
		line-height: 1.08;
		letter-spacing: 0.015em;
		text-transform: uppercase;
		color: #ffe28a;
		background: linear-gradient(180deg, #fff6c8 0%, #ffd56a 38%, #e8a020 72%, #b8730f 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 1px 0 #fff3b0) drop-shadow(0 3px 0 #5a3a0e)
			drop-shadow(0 7px 10px rgba(0, 0, 0, 0.55));
	}

	.message-text {
		margin: calc(var(--panel-width) * 0.038) 0 0;
		width: 100%;
		padding: 0 2%;
		text-align: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.026);
		font-weight: 700;
		line-height: 1.4;
		color: #f5e0c0;
		text-shadow:
			0 1px 0 #000,
			1px 1px 3px rgba(0, 0, 0, 0.9);
	}

	.ok-btn {
		--ok-btn-w: calc(var(--panel-width) * 0.36);
		--ok-btn-h: calc(var(--panel-width) * 0.076);
		position: absolute;
		left: 50%;
		bottom: var(--ok-btn-bottom);
		transform: translateX(-50%);
		width: var(--ok-btn-w);
		height: var(--ok-btn-h);
		padding: 0;
		border: 0;
		border-radius: 0;
		cursor: pointer;
		background-color: transparent;
		overflow: hidden;
		transition:
			transform 0.1s,
			filter 0.15s;

		&:hover {
			filter: brightness(1.12);
		}

		&:active {
			transform: translateX(-50%) translateY(2px);
		}
	}

	/* Banner strip on fs_board artboard (y≈62.5%, 2000×1500). */
	.ok-btn-bg {
		position: absolute;
		left: 0;
		top: calc(var(--ok-btn-h) * 0.5 - var(--ok-btn-w) * 0.46875);
		width: 100%;
		height: auto;
		pointer-events: none;
		user-select: none;
	}

	.ok-btn-label {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.026);
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #ffe28a;
		text-shadow:
			0 1px 0 #fff3b0,
			0 2px 0 #5a3a0e,
			0 4px 6px rgba(0, 0, 0, 0.55);
		pointer-events: none;
	}

	.message-panel.portrait:not(.popout-l):not(.popout-s) {
		--panel-width: min(920px, 100vw);
		--ok-btn-bottom: 35%;
		transform: scale(1.28);
		transform-origin: center center;

		.content-safe {
			top: 27%;
			left: 20%;
			right: 20%;
			bottom: 22%;
		}

		.message-title {
			margin-top: calc(var(--panel-width) * 0.002);
		}

		.message-title {
			font-size: calc(var(--panel-width) * 0.044);
		}

		.message-text {
			font-size: calc(var(--panel-width) * 0.027);
		}
	}

	.message-panel.popout-l {
		--panel-width: min(520px, 94vw);
	}

	.message-panel.popout-s {
		--panel-width: min(480px, 99vw);

		.content-safe {
			left: 19%;
			right: 19%;
		}

		.message-title {
			font-size: calc(var(--panel-width) * 0.046);
		}

		.message-text {
			font-size: calc(var(--panel-width) * 0.029);
		}

		.ok-btn-label {
			font-size: calc(var(--panel-width) * 0.032);
		}
	}
</style>
