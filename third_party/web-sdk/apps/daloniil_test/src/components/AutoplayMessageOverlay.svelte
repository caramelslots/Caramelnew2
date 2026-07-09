<!--
	AutoplayMessageOverlay.svelte — сообщение об остановке автоигры (недостаток средств и др.).
	bg_autoplay_message_panel (поздравление фриспины.png) + autoplay_message_ok_bg (b1.png).
	Close — HUD_ASSETS.betPlus повёрнутый на 45°.
-->
<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { stateModal } from 'state-shared';
	import { getContextLayout } from 'utils-layout';

	import { getContext } from '../game/context';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';
	import { AUTOSPIN_ASSETS, HUD_ASSETS } from '../game/uiHtmlAssetManifest';

	const context = getContext();
	const { stateLayoutDerived } = getContextLayout();

	const bgUrl = AUTOSPIN_ASSETS.messageBg;
	const okButtonBgUrl = AUTOSPIN_ASSETS.messageOkBg;
	const closeIconUrl = HUD_ASSETS.betPlus;

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
	<div
		class="message-overlay"
		role="presentation"
		transition:fade={{ duration: 180 }}
	>
		<button
			class="message-backdrop"
			type="button"
			aria-label="close"
			onclick={close}
		></button>

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
			<div class="panel-bg-clip">
				<img class="panel-bg" src={bgUrl} alt="" draggable="false" loading="eager" />
			</div>

			<div class="panel-content">
				<header class="panel-header">
					<button
						type="button"
						class="close-button"
						onclick={close}
						aria-label="close"
						data-test="autoplay-message-close"
					>
						<img class="close-icon" src={closeIconUrl} alt="" draggable="false" />
					</button>
				</header>

				<section class="message-body" aria-live="polite">
					<h2 class="message-title" data-test="auto-spin-stop-content">{copy.title}</h2>
					<p class="message-text">{copy.body}</p>
				</section>

				<footer class="message-actions">
					<button
						type="button"
						class="ok-btn"
						style:background-image="url('{okButtonBgUrl}')"
						onclick={close}
						data-test="autoplay-message-ok"
					>
						{context.i18nDerived.autoplayMessageOk()}
					</button>
				</footer>
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

	/* Panel background is 1536×1024 (3:2 ratio). */
	.message-panel {
		--panel-width: min(620px, 92vw);
		--panel-aspect: calc(1536 / 1024);
		position: relative;
		width: var(--panel-width);
		aspect-ratio: var(--panel-aspect);
		max-height: 92vh;
		pointer-events: auto;
		filter: drop-shadow(0 20px 50px rgba(0, 0, 0, 0.75));
		z-index: 1;
	}

	/* Clip the bg image so transparent edges of the PNG don't show as dark lines. */
	.panel-bg-clip {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	.panel-bg {
		display: block;
		width: 108%;
		height: 100%;
		margin: 0 -4%;
		object-fit: fill;
		pointer-events: none;
		user-select: none;
	}

	.panel-content {
		position: absolute;
		inset: 0;
	}

	.panel-header {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 18%;
		display: flex;
		align-items: flex-start;
		justify-content: flex-end;
		padding: 0 1% 0 0;
		box-sizing: border-box;
		pointer-events: none;
	}

	.close-button {
		position: relative;
		width: calc(var(--panel-width) * 0.082);
		height: calc(var(--panel-width) * 0.082);
		margin-top: calc(var(--panel-width) * 0.014);
		margin-right: calc(var(--panel-width) * -0.048);
		padding: 0;
		border: 0;
		outline: none;
		background: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: auto;
		transition:
			transform 0.12s,
			filter 0.12s;

		&:focus-visible {
			outline: none;
		}

		&:hover {
			filter: brightness(1.15);
			transform: scale(1.07);
		}

		&:active {
			transform: scale(0.94);
		}
	}

	/* betPlus icon rotated 45° → becomes an ✕ */
	.close-icon {
		width: 100%;
		height: 100%;
		object-fit: contain;
		transform: rotate(45deg);
		pointer-events: none;
		user-select: none;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.7));
	}

	/* Text sits in the wooden board area (below the roof, above the bowl). */
	.message-body {
		position: absolute;
		top: 19%;
		left: 8%;
		right: 8%;
		bottom: 26%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: calc(var(--panel-width) * 0.028);
		text-align: center;
		box-sizing: border-box;
	}

	.message-title {
		margin: 0;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.054);
		font-weight: 900;
		line-height: 1.05;
		letter-spacing: 0.01em;
		color: #ffd633;
		text-shadow:
			0 2px 0 #3b1a00,
			0 -1px 0 #3b1a00,
			1px 0 0 #3b1a00,
			-1px 0 0 #3b1a00,
			0 0 12px rgba(255, 160, 0, 0.55);
	}

	.message-text {
		margin: 0;
		max-width: 84%;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.031);
		font-weight: 700;
		line-height: 1.3;
		color: #f5e0c0;
		text-shadow:
			0 1px 0 #000,
			1px 1px 3px rgba(0, 0, 0, 0.9);
	}

	/* OK button in the lower portion of the panel. */
	.message-actions {
		position: absolute;
		bottom: 25%;
		left: 0;
		right: 0;
		height: 13%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
	}

	/* Button background is b1.png (343×165). */
	.ok-btn {
		width: auto;
		height: 100%;
		max-width: 46%;
		aspect-ratio: 343 / 165;
		padding: 0;
		border: 0;
		border-radius: 0;
		cursor: pointer;
		background-color: transparent;
		background-repeat: no-repeat;
		background-position: center;
		background-size: 100% 100%;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.038);
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #f5e6c8;
		text-shadow:
			0 1px 0 #3b1a00,
			0 0 8px rgba(180, 100, 0, 0.6);
		transition:
			transform 0.1s,
			filter 0.15s;

		&:hover {
			filter: brightness(1.12);
		}

		&:active {
			transform: translateY(2px);
		}
	}

	/* ── Portrait ──────────────────────────────────────────────────── */
	.message-panel.portrait:not(.popout-l):not(.popout-s) {
		--panel-width: min(660px, 94vw);

		.close-button {
			margin-top: calc(var(--panel-width) * 0.02);
			margin-right: calc(var(--panel-width) * -0.04);
		}

		.message-body {
			top: 17%;
			bottom: 28%;
		}

		.message-title {
			font-size: calc(var(--panel-width) * 0.058);
		}

		.message-text {
			font-size: calc(var(--panel-width) * 0.034);
		}

		.message-actions {
			bottom: 24%;
			height: 12%;
		}
	}

	/* ── Popout large ──────────────────────────────────────────────── */
	.message-panel.popout-l {
		--panel-width: min(380px, 88vw);
	}

	/* ── Popout small ──────────────────────────────────────────────── */
	.message-panel.popout-s {
		--panel-width: min(230px, 72vw);

		.message-title {
			font-size: calc(var(--panel-width) * 0.062);
		}

		.message-text {
			font-size: calc(var(--panel-width) * 0.036);
		}

		.ok-btn {
			font-size: calc(var(--panel-width) * 0.043);
		}
	}
</style>
