<!--
	Export-card pick screen (designer_assets/export): blurred backdrop, three cards
	with the designer flip, gold hint. Shared by the FS entry pick and the DEV preview;
	the parent owns `{#if}` so the |global transitions play on open / close.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';

	import { getContext } from '../game/context';
	import { EXPORT_CARD_SPINE } from '../game/exportCardAssets';
	import { isHtmlImageDecoded, preloadHtmlImages } from '../game/preloadHtmlImages';
	import ExportCard from './ExportCard.svelte';

	type Props = {
		/** Free spins printed on each card front. */
		values: readonly number[];
		faceUp: readonly boolean[];
		hint: string;
		/** Picked card — the others dim once they are revealed. */
		chosen?: number | null;
		locked?: boolean;
		zIndex?: number;
		onPick: (index: number) => void;
		/** Shows the close button and enables Esc (DEV preview only). */
		onClose?: () => void;
	};

	const {
		values,
		faceUp,
		hint,
		chosen = null,
		locked = false,
		zIndex = 70,
		onPick,
		onClose,
	}: Props = $props();

	const context = getContext();
	const reduced = $derived(prefersReducedMotion.current);
	const freeSpinsLabel = $derived(context.i18nDerived.fsRemaining());

	let pageReady = $state(isHtmlImageDecoded(EXPORT_CARD_SPINE.page));
	let dialogEl = $state<HTMLDivElement | undefined>();
	let closeEl = $state<HTMLButtonElement | undefined>();

	const rise = (
		_node: Element,
		{ duration, y = 16, start = 0.97 }: { duration: number; y?: number; start?: number },
	) => ({
		duration,
		easing: cubicOut,
		css: (t: number, u: number) =>
			`opacity:${t};transform:translateY(${u * y}px) scale(${start + (1 - start) * t})`,
	});

	const focusables = () =>
		dialogEl
			? [...dialogEl.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"])')]
			: [];

	const trapTab = (e: KeyboardEvent) => {
		const items = focusables();
		if (items.length === 0) {
			e.preventDefault();
			return;
		}
		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement;
		const inside = active instanceof HTMLElement && dialogEl?.contains(active);
		if (e.shiftKey && (active === first || !inside)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && (active === last || !inside)) {
			e.preventDefault();
			first.focus();
		}
	};

	$effect(() => {
		if (!pageReady) {
			void preloadHtmlImages([EXPORT_CARD_SPINE.page], { retain: true }).then(() => {
				pageReady = true;
			});
		}

		const restoreFocus =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		void tick().then(() => (closeEl ?? dialogEl)?.focus({ preventScroll: true }));

		/* Capture on window so game hotkeys (Space = spin, Shift+D) never see keys while open. */
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && onClose) {
				e.preventDefault();
				onClose();
			} else if (e.key === 'Tab') {
				trapTab(e);
			}
			e.stopPropagation();
		};
		const onKeyUp = (e: KeyboardEvent) => e.stopPropagation();
		window.addEventListener('keydown', onKeyDown, true);
		window.addEventListener('keyup', onKeyUp, true);

		return () => {
			window.removeEventListener('keydown', onKeyDown, true);
			window.removeEventListener('keyup', onKeyUp, true);
			if (restoreFocus?.isConnected) restoreFocus.focus({ preventScroll: true });
		};
	});
</script>

<div
	class="export-cards"
	style={`--z:${zIndex}`}
	transition:fade|global={{ duration: reduced ? 120 : 220, easing: cubicOut }}
	onwheel={(e) => e.stopPropagation()}
	data-test="export-cards-overlay"
>
	<button
		type="button"
		class="backdrop"
		tabindex="-1"
		aria-label={onClose ? 'Close export cards' : undefined}
		aria-hidden={onClose ? undefined : 'true'}
		onclick={() => onClose?.()}
	></button>

	<div
		class="screen"
		bind:this={dialogEl}
		role="dialog"
		aria-modal="true"
		aria-labelledby="export-cards-hint"
		tabindex="-1"
		in:rise|global={{ duration: reduced ? 0 : 360 }}
		out:rise|global={{ duration: reduced ? 0 : 180, y: 8, start: 0.985 }}
	>
		<header class="header">
			{#if onClose}
				<button
					type="button"
					class="close"
					bind:this={closeEl}
					aria-label="Close export cards"
					onclick={onClose}
				>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path d="M6 6l12 12M18 6L6 18" />
					</svg>
				</button>
			{/if}
		</header>

		<div class="stage">
			{#if pageReady}
				<ul class="cards">
					{#each values as value, i (i)}
						<li
							class="slot"
							class:chosen={chosen === i}
							class:dimmed={chosen != null && chosen !== i && faceUp[i]}
							in:fly|global={{
								y: 28,
								duration: reduced ? 0 : 440,
								delay: reduced ? 0 : 90 + i * 70,
								easing: cubicOut,
							}}
						>
							<ExportCard
								index={i}
								faceUp={faceUp[i] === true}
								freeSpins={value}
								{freeSpinsLabel}
								disabled={locked}
								onToggle={() => onPick(i)}
							/>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<footer class="footer">
			<p id="export-cards-hint" class="hint" class:hint--hidden={locked}>
				<span class="hint__text">{hint}</span>
			</p>
		</footer>
	</div>
</div>

<style lang="scss">
	.export-cards {
		--gold-text: #ffe9b0;
		--gold-line: rgba(255, 213, 106, 0.55);
		--pad-x: max(env(safe-area-inset-left), env(safe-area-inset-right), clamp(12px, 3vw, 40px));
		--pad-y: clamp(10px, 3vh, 36px);

		position: fixed;
		inset: 0;
		z-index: var(--z);
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		padding: max(var(--pad-y), env(safe-area-inset-top)) var(--pad-x)
			max(var(--pad-y), env(safe-area-inset-bottom));
		font-family: 'proxima-nova', sans-serif;
		color: var(--gold-text);
		user-select: none;
		overscroll-behavior: contain;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		margin: 0;
		padding: 0;
		border: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(30px);
		-webkit-backdrop-filter: blur(30px);
		cursor: default;
		-webkit-tap-highlight-color: transparent;
	}

	.screen {
		position: relative;
		outline: none;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
		gap: clamp(8px, 2.5vh, 28px);
		width: 100%;
		max-width: 1180px;
		height: 100%;
		max-height: 900px;
		pointer-events: none;

		> * {
			pointer-events: auto;
		}
	}

	.header {
		display: flex;
		justify-content: flex-end;
	}

	.close {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 1px solid var(--gold-line);
		border-radius: 50%;
		background: rgba(20, 8, 32, 0.72);
		color: var(--gold-text);
		cursor: pointer;
		transition:
			background 140ms ease-out,
			border-color 140ms ease-out;
		-webkit-tap-highlight-color: transparent;

		svg {
			width: 20px;
			height: 20px;
			fill: none;
			stroke: currentColor;
			stroke-width: 2.2;
			stroke-linecap: round;
		}

		@media (hover: hover) and (pointer: fine) {
			&:hover {
				background: rgba(52, 20, 78, 0.85);
				border-color: #ffd56a;
			}
		}

		&:focus-visible {
			outline: 2px solid #ffd56a;
			outline-offset: 2px;
		}
	}

	/* Card size is resolved against this box, so every viewport in between scales too. */
	.stage {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 0;
		container-type: size;
	}

	.cards {
		--gap: clamp(10px, 3.2cqw, 44px);
		--card-w: min((100cqw - 2 * var(--gap)) / 3, 100cqh * 553 / 853, 340px);

		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--gap);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: calc(var(--card-w) * 0.06);
	}

	.slot {
		flex: none;
		width: var(--card-w);
		transition:
			transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1),
			filter 360ms ease-out;
	}

	.slot.chosen {
		transform: scale(1.06);
		filter: drop-shadow(0 0 calc(var(--card-w) * 0.08) rgba(255, 213, 106, 0.55));
	}

	.slot.dimmed {
		transform: scale(0.94);
		filter: brightness(0.6) saturate(0.75);
	}

	.footer {
		display: flex;
		justify-content: center;
	}

	/* Same gold face as PRESS TO CONTINUE, framed by fading rules. */
	.hint {
		--rule: clamp(28px, 7vw, 96px);

		display: flex;
		align-items: center;
		gap: clamp(10px, 1.6vw, 20px);
		margin: 0;
		font-size: clamp(15px, 1.5vw + 0.7vh, 26px);
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: 0.08em;
		text-align: center;
		text-transform: uppercase;

		&::before,
		&::after {
			content: '';
			flex: none;
			width: var(--rule);
			height: 2px;
			border-radius: 1px;
			box-shadow: 0 1px 0 rgba(90, 58, 14, 0.8);
		}

		&::before {
			background: linear-gradient(90deg, rgba(255, 213, 106, 0), #ffd56a);
		}

		&::after {
			background: linear-gradient(90deg, #ffd56a, rgba(255, 213, 106, 0));
		}
	}

	.hint {
		transition: opacity 240ms ease-out;
	}

	.hint.hint--hidden {
		opacity: 0;
	}

	.hint__text {
		color: #ffe28a;
		background: linear-gradient(180deg, #fff6c8 0%, #ffd56a 38%, #e8a020 72%, #b8730f 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 1px 0 #fff3b0) drop-shadow(0 3px 0 #5a3a0e)
			drop-shadow(0 6px 10px rgba(0, 0, 0, 0.55));
		animation: hint-breathe 2400ms ease-in-out infinite;
	}

	@keyframes hint-breathe {
		0%,
		100% {
			opacity: 0.78;
		}
		50% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hint__text {
			animation: none;
		}

		.slot {
			transition: filter 200ms ease-out;
		}

		.slot.chosen,
		.slot.dimmed {
			transform: none;
		}
	}

	/* Landscape phones: give the row of cards the height. */
	@media (max-height: 480px) {
		.screen {
			gap: 6px;
		}

		.close {
			width: 40px;
			height: 40px;
		}

		.hint {
			font-size: 14px;
		}
	}
</style>
