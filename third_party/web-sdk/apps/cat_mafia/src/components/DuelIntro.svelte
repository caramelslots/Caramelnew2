<script lang="ts" module>
	export type EmitterEventDuelIntro =
		| { type: 'duelIntroShow' }
		| { type: 'duelIntroHide' }
		| {
				type: 'duelIntroUpdate';
				totalSpinsPerSide: number;
				playerSide?: 'cat' | 'dog';
		  };
</script>

<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';
	import { OnHotkey } from 'components-shared';
	import { waitForResolve } from 'utils-shared/wait';

	import assets from '../game/assets';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { isPopoutSmallViewport, isPopoutViewport } from '../game/constants';
	import PressToContinueHtml from './PressToContinueHtml.svelte';

	const context = getContext();

	const bgUrl = assets.fsCongBg.src;
	const frameUrl = assets.fsCongFrame.src;

	const layoutType = $derived(context.stateLayoutDerived.layoutType());
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPortrait = $derived(layoutType === 'portrait');
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes) && !isPopoutSmall);

	let show = $state(false);
	let oncomplete = $state(() => {});
	let winnerEl = $state<HTMLParagraphElement | undefined>();
	let winnerSlotEl = $state<HTMLDivElement | undefined>();
	/** Shrink long locales so the punchline stays inside the gold frame. */
	let winnerFitScale = $state(1);

	const ruleCat = $derived(context.i18nDerived.duelIntroRule1());
	const ruleDog = $derived(context.i18nDerived.duelIntroRule2());
	const ruleWinner = $derived(context.i18nDerived.duelIntroRule3());

	const MIN_WINNER_FIT = 0.55;

	const refitWinner = () => {
		const el = winnerEl;
		const slot = winnerSlotEl;
		if (!el || !slot) return;

		winnerFitScale = 1;
		el.style.transform = 'scale(1)';

		const maxW = slot.clientWidth;
		if (maxW <= 0) return;

		const natural = el.scrollWidth;
		if (natural <= 0) return;

		winnerFitScale = Math.min(1, Math.max(MIN_WINNER_FIT, maxW / natural));
		el.style.transform = `scale(${winnerFitScale})`;
	};

	$effect(() => {
		if (!show) return;
		ruleWinner;
		canvasSizes.width;
		canvasSizes.height;
		requestAnimationFrame(() => requestAnimationFrame(refitWinner));
	});

	$effect(() => {
		const slot = winnerSlotEl;
		if (!slot || !show) return;
		const observer = new ResizeObserver(() => refitWinner());
		observer.observe(slot);
		return () => observer.disconnect();
	});

	const dismiss = () => oncomplete();

	context.eventEmitter.subscribeOnMount({
		duelIntroShow: () => {
			context.eventEmitter.broadcast({ type: 'duelPickWarm' });
			show = true;
			stateGame.duelIntroActive = true;
		},
		duelIntroHide: () => {
			show = false;
			stateGame.duelIntroActive = false;
		},
		duelIntroUpdate: async () => {
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

{#if show}
	<div
		class="overlay"
		class:portrait={isPortrait}
		class:popout-s={isPopoutSmall}
		data-test="duel-intro-overlay"
		transition:fade={{ duration: 200 }}
		onclick={dismiss}
		onkeydown={(e) => e.key === 'Enter' && dismiss()}
		role="button"
		tabindex="0"
	>
		<div
			class="board"
			class:portrait={isPortrait}
			class:popout-l={isPopout}
			class:popout-s={isPopoutSmall}
			role="dialog"
			aria-modal="true"
			aria-label={ruleWinner}
			in:scale={{ duration: 320, easing: backOut, start: 0.88, opacity: 0 }}
			out:scale={{ duration: 200, easing: cubicOut, start: 0.95, opacity: 0 }}
		>
			<img class="layer layer-bg" src={bgUrl} alt="" draggable="false" loading="eager" />
			<img class="layer layer-frame" src={frameUrl} alt="" draggable="false" loading="eager" />

			<div class="board-content">
				<div class="content-safe">
					<p class="rule-line cat">{ruleCat}</p>
					<span class="rule-vs" aria-hidden="true">VS</span>
					<p class="rule-line dog">{ruleDog}</p>
					<div class="rule-divider" aria-hidden="true"></div>
					<div class="rule-winner-slot" bind:this={winnerSlotEl}>
						<p
							class="rule-winner"
							bind:this={winnerEl}
							style:transform="scale({winnerFitScale})"
						>
							{ruleWinner}
						</p>
					</div>
				</div>
			</div>
		</div>

		<PressToContinueHtml />
	</div>
{/if}

<OnHotkey hotkey="Space" disabled={!show} onpress={dismiss} />

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		cursor: pointer;
		background: rgba(0, 0, 0, 0.62);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(0.75rem, 2vh, 1.5rem);
		box-sizing: border-box;
	}

	.board {
		--panel-width: min(860px, 98vw);
		position: relative;
		width: var(--panel-width);
		aspect-ratio: calc(2000 / 1500);
		max-height: 82vh;
		pointer-events: none;
		filter: drop-shadow(0 20px 50px rgba(0, 0, 0, 0.75));
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

	.board-content {
		position: absolute;
		inset: 0;
		z-index: 2;
	}

	/* Keep clear of gold frame + bottom paw medallion. */
	.content-safe {
		position: absolute;
		top: 26%;
		left: 15%;
		right: 15%;
		bottom: 28%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: calc(var(--panel-width) * 0.01);
		box-sizing: border-box;
		text-align: center;
		overflow: hidden;
	}

	.rule-line {
		margin: 0;
		width: 100%;
		padding: 0 2%;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.042);
		font-weight: 800;
		line-height: 1.25;
		letter-spacing: 0.02em;
		color: #f8e6c4;
		text-shadow:
			0 1px 0 #000,
			1px 1px 3px rgba(0, 0, 0, 0.9),
			0 0 18px rgba(255, 210, 120, 0.18);
	}

	.rule-line.cat {
		color: #ffe2b0;
	}

	.rule-line.dog {
		color: #dce8ff;
		text-shadow:
			0 1px 0 #000,
			1px 1px 3px rgba(0, 0, 0, 0.9),
			0 0 18px rgba(140, 180, 255, 0.2);
	}

	.rule-vs {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: calc(var(--panel-width) * 0.08);
		padding: 0.14em 0.5em;
		border-radius: 999px;
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		font-size: calc(var(--panel-width) * 0.024);
		letter-spacing: 0.14em;
		color: #ffe7a0;
		background: rgba(18, 10, 28, 0.78);
		border: 1px solid rgba(255, 214, 120, 0.45);
		box-shadow:
			0 0 14px rgba(255, 190, 60, 0.22),
			inset 0 1px 0 rgba(255, 240, 200, 0.12);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
	}

	.rule-divider {
		width: min(58%, 220px);
		height: 2px;
		margin: calc(var(--panel-width) * 0.008) 0 calc(var(--panel-width) * 0.004);
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(255, 210, 110, 0.15) 12%,
			rgba(255, 220, 130, 0.9) 50%,
			rgba(255, 210, 110, 0.15) 88%,
			transparent 100%
		);
		box-shadow: 0 0 12px rgba(255, 190, 60, 0.35);
	}

	.rule-winner-slot {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		box-sizing: border-box;
	}

	.rule-winner {
		margin: 0;
		width: max-content;
		max-width: none;
		padding: 0;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.04);
		font-weight: 800;
		line-height: 1.12;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		white-space: nowrap;
		transform-origin: center center;
		color: #ffe28a;
		text-shadow:
			0 1px 0 #fff3b0,
			0 2px 0 #5a3a0e,
			0 5px 12px rgba(0, 0, 0, 0.55);
	}

	.board.portrait:not(.popout-l):not(.popout-s) {
		--panel-width: min(920px, 100vw);
		transform: scale(1.12);
		transform-origin: center center;

		.content-safe {
			top: 26%;
			left: 15%;
			right: 15%;
			bottom: 28%;
		}

		.rule-line {
			font-size: calc(var(--panel-width) * 0.044);
		}

		.rule-winner {
			font-size: calc(var(--panel-width) * 0.046);
		}
	}

	.board.popout-l {
		--panel-width: min(520px, 94vw);
	}

	.board.popout-s {
		--panel-width: min(480px, 99vw);

		.content-safe {
			top: 26%;
			left: 14%;
			right: 14%;
			bottom: 28%;
		}

		.rule-line {
			font-size: calc(var(--panel-width) * 0.044);
		}

		.rule-vs {
			font-size: calc(var(--panel-width) * 0.028);
		}

		.rule-winner {
			font-size: calc(var(--panel-width) * 0.042);
		}
	}

	.overlay.popout-s .board {
		max-height: 70vh;
	}
</style>
