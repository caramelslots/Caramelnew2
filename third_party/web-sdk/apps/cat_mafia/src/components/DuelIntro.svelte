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
	let catEl = $state<HTMLParagraphElement | undefined>();
	let catSlotEl = $state<HTMLDivElement | undefined>();
	let dogEl = $state<HTMLParagraphElement | undefined>();
	let dogSlotEl = $state<HTMLDivElement | undefined>();
	let winnerEl = $state<HTMLParagraphElement | undefined>();
	let winnerSlotEl = $state<HTMLDivElement | undefined>();
	/** Shrink long locales so copy stays inside the gold frame. */
	let catFitScale = $state(1);
	let dogFitScale = $state(1);
	let winnerFitScale = $state(1);

	const ruleCat = $derived(context.i18nDerived.duelIntroRule1());
	const ruleDog = $derived(context.i18nDerived.duelIntroRule2());
	const ruleWinner = $derived(context.i18nDerived.duelIntroRule3());

	const MIN_LINE_FIT = 0.55;

	const refitLine = (
		el: HTMLParagraphElement | undefined,
		slot: HTMLDivElement | undefined,
		setScale: (scale: number) => void,
	) => {
		if (!el || !slot) return;

		setScale(1);
		el.style.transform = 'scale(1)';

		const maxW = slot.clientWidth;
		if (maxW <= 0) return;

		const natural = el.scrollWidth;
		if (natural <= 0) return;

		const scale = Math.min(1, Math.max(MIN_LINE_FIT, maxW / natural));
		setScale(scale);
		el.style.transform = `scale(${scale})`;
	};

	const refitAllLines = () => {
		refitLine(catEl, catSlotEl, (scale) => (catFitScale = scale));
		refitLine(dogEl, dogSlotEl, (scale) => (dogFitScale = scale));
		refitLine(winnerEl, winnerSlotEl, (scale) => (winnerFitScale = scale));
	};

	$effect(() => {
		if (!show) return;
		ruleCat;
		ruleDog;
		ruleWinner;
		canvasSizes.width;
		canvasSizes.height;
		requestAnimationFrame(() => requestAnimationFrame(refitAllLines));
	});

	$effect(() => {
		const slots = [catSlotEl, dogSlotEl, winnerSlotEl].filter(Boolean) as HTMLDivElement[];
		if (slots.length === 0 || !show) return;
		const observer = new ResizeObserver(() => refitAllLines());
		for (const slot of slots) observer.observe(slot);
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
					<div class="rule-line-slot" bind:this={catSlotEl}>
						<p
							class="rule-line"
							bind:this={catEl}
							style:transform="scale({catFitScale})"
						>
							{ruleCat}
						</p>
					</div>
					<div class="rule-line-slot" bind:this={dogSlotEl}>
						<p
							class="rule-line"
							bind:this={dogEl}
							style:transform="scale({dogFitScale})"
						>
							{ruleDog}
						</p>
					</div>
					<div class="rule-divider" aria-hidden="true"></div>
					<div class="rule-line-slot rule-line-slot--winner" bind:this={winnerSlotEl}>
						<p
							class="rule-line rule-line--winner"
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

	.rule-line-slot {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		box-sizing: border-box;
	}

	/* Nudge the first rule line slightly above the centered stack. */
	.rule-line-slot:first-child {
		margin-top: calc(var(--panel-width) * -0.032);
	}

	/* Same face as FreeSpinIntro CONGRATULATIONS (proxima-nova + gold gradient). */
	.rule-line {
		margin: 0;
		width: max-content;
		max-width: none;
		padding: 0;
		font-family: 'proxima-nova', sans-serif;
		font-size: calc(var(--panel-width) * 0.044);
		font-weight: 800;
		line-height: 1.25;
		letter-spacing: 0.02em;
		transform-origin: center center;
		white-space: nowrap;
		color: #ffe28a;
		background: linear-gradient(180deg, #fff6c8 0%, #ffd56a 38%, #e8a020 72%, #b8730f 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 1px 0 #fff3b0);
	}

	.rule-line--winner {
		font-size: calc(var(--panel-width) * 0.042);
		line-height: 1.12;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.rule-line-slot--winner {
		margin-top: calc(var(--panel-width) * 0.018);
	}

	.rule-divider {
		width: min(58%, 220px);
		height: 2px;
		margin: calc(var(--panel-width) * 0.008) 0 calc(var(--panel-width) * 0.012);
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
			font-size: calc(var(--panel-width) * 0.046);
		}

		.rule-line--winner {
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
			font-size: calc(var(--panel-width) * 0.046);
		}

		.rule-line--winner {
			font-size: calc(var(--panel-width) * 0.044);
		}
	}

	.overlay.popout-s .board {
		max-height: 70vh;
	}
</style>
