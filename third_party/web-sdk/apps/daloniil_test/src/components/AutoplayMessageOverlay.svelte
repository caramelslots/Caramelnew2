<!--
	AutoplayMessageOverlay — panel structure identical to BuyBonusOverlay.
	position: relative, centered by parent flex container in the shell.
-->
<script lang="ts">
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

	const COPY: Record<AutoSpinMessageKey, { title: string; body: string }> = {
		insufficientFunds: {
			title: 'Insufficient funds',
			body: 'Top up your balance or decrease the bet to continue the game.',
		},
		lossLimitReached: {
			title: 'Loss limit reached',
			body: 'Auto play has stopped because the loss limit was reached.',
		},
		singleWinLimitReached: {
			title: 'Single win limit reached',
			body: 'Auto play has stopped because the single win limit was reached.',
		},
	};

	const isOpen = $derived(stateModal.modal?.name === 'autoSpinMessage');
	const messageKey = $derived(
		stateModal.modal?.name === 'autoSpinMessage' ? stateModal.modal.message : 'insufficientFunds',
	);
	const copy = $derived(COPY[messageKey]);

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

<svelte:window onkeydown={(e) => { if (isOpen && e.key === 'Escape') close(); }} />

<!-- position:relative — flex child, centered by parent shell .panel-slot (same as BuyBonusOverlay) -->
<div
	class="message-panel"
	class:portrait={isPortrait}
	class:popout-l={isPopout}
	class:popout-s={isPopoutSmall}
	role="dialog"
	aria-modal="true"
	aria-hidden={!isOpen}
	data-test="autoplay-message-overlay"
>
	<img class="panel-bg" src={bgUrl} alt="" draggable="false" loading="eager" />

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
				OK
			</button>
		</footer>
	</div>
</div>

<style lang="scss">
	/* === Panel — identical structure to BuyBonusOverlay .buy-bonus-panel === */
	.message-panel {
		--panel-width: min(640px, 92vw);
		position: relative;
		width: var(--panel-width);
		/* height: width * (1024/1445) — image is 1445×1024 */
		height: min(calc(var(--panel-width) * 0.709), 92vh);
		pointer-events: auto;
		filter: drop-shadow(0 16px 42px rgba(0, 0, 0, 0.65));
	}

	.panel-bg {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
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
		height: 22%;
		display: flex;
		justify-content: flex-end;
		align-items: flex-start;
		padding: 0 4% 0 0;
		box-sizing: border-box;
		pointer-events: none;
	}

	.close-button {
		position: relative;
		width: calc(var(--panel-width) * 0.09);
		height: calc(var(--panel-width) * 0.09);
		margin-top: calc(var(--panel-width) * 0.038);
		margin-right: calc(var(--panel-width) * -0.055);
		padding: 0;
		border: 0;
		outline: none;
		background: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: auto;
		transition: transform 0.12s, filter 0.12s;

		&:hover { filter: brightness(1.12); transform: scale(1.06); }
		&:active { transform: scale(0.96); }
	}

	.close-icon {
		width: 100%;
		height: 100%;
		object-fit: contain;
		transform: rotate(45deg);
		pointer-events: none;
		user-select: none;
	}

	.message-body {
		position: absolute;
		top: 26%;
		left: 10%;
		right: 10%;
		bottom: 24%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: calc(var(--panel-width) * 0.025);
		text-align: center;
		box-sizing: border-box;
	}

	.message-title {
		margin: 0;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.048);
		font-weight: 900;
		line-height: 1.05;
		letter-spacing: 0.02em;
		color: #ffd633;
		text-shadow: 0 2px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000;
	}

	.message-text {
		margin: 0;
		max-width: 88%;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.028);
		font-weight: 700;
		line-height: 1.25;
		color: #ffffff;
		text-shadow: 0 1px 0 #000, 1px 1px 2px rgba(0, 0, 0, 0.85);
	}

	.message-actions {
		position: absolute;
		top: 63%;
		left: 0;
		right: 0;
		height: 14%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ok-btn {
		height: 100%;
		max-width: 42%;
		aspect-ratio: 343 / 165;
		padding: 0;
		border: 0;
		cursor: pointer;
		background-color: transparent;
		background-repeat: no-repeat;
		background-position: center;
		background-size: 100% 100%;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.034);
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #f5e6c8;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
		transition: transform 0.1s, filter 0.15s;

		&:hover { filter: brightness(1.1); }
		&:active { transform: translateY(1px); }
	}

	/* Portrait */
	.message-panel.portrait:not(.popout-l):not(.popout-s) {
		--panel-width: min(680px, 94vw);
		height: min(calc(var(--panel-width) * 0.709), 92vh);
	}

	/* Popouts */
	.message-panel.popout-l {
		--panel-width: min(400px, 88vw);
		height: min(calc(var(--panel-width) * 0.709), 92vh);
	}

	.message-panel.popout-s {
		--panel-width: min(240px, 72vw);
		height: min(calc(var(--panel-width) * 0.709), 92vh);
	}
</style>
