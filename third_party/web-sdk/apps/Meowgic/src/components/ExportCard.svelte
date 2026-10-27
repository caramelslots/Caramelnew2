<!--
	One export card (designer_assets/export). Back / front are atlas regions of
	`Card.webp`; the flip replays the designer `rotate` clip (scaleX squash,
	face swap at the midpoint) on the HTML layer.
-->
<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';

	import {
		EXPORT_CARD_FLIP_EASING,
		EXPORT_CARD_FLIP_HALF_MS,
		EXPORT_CARD_SPINE,
		exportCardFaceStyle,
	} from '../game/exportCardAssets';

	type Props = {
		index: number;
		faceUp: boolean;
		/** Free spins revealed on the front (bonus entry). */
		freeSpins: number;
		/** Localised caption under the number (`FREE SPINS`). */
		freeSpinsLabel: string;
		disabled?: boolean;
		onToggle: () => void;
	};

	const { index, faceUp, freeSpins, freeSpinsLabel, disabled = false, onToggle }: Props =
		$props();

	let flipEl = $state<HTMLDivElement | undefined>();
	let shownFaceUp = $state(faceUp);
	let flipping = false;

	const squash = (el: HTMLElement, from: number, to: number) =>
		el.animate([{ transform: `scaleX(${from})` }, { transform: `scaleX(${to})` }], {
			duration: EXPORT_CARD_FLIP_HALF_MS,
			easing: EXPORT_CARD_FLIP_EASING,
			fill: 'forwards',
		}).finished;

	const syncFace = async () => {
		if (flipping) return;
		flipping = true;
		try {
			while (shownFaceUp !== faceUp) {
				const el = flipEl;
				if (!el || prefersReducedMotion.current) {
					shownFaceUp = faceUp;
					break;
				}
				await squash(el, 1, 0);
				shownFaceUp = !shownFaceUp;
				await squash(el, 0, 1);
				el.getAnimations().forEach((animation) => animation.cancel());
			}
		} catch {
			/* animation cancelled on unmount */
			shownFaceUp = faceUp;
		} finally {
			flipping = false;
		}
	};

	$effect(() => {
		if (faceUp !== shownFaceUp) void syncFace();
	});

	const label = $derived(
		faceUp ? `Card ${index + 1}, ${freeSpins} ${freeSpinsLabel}` : `Card ${index + 1}, face down`,
	);
</script>

<button
	type="button"
	class="export-card"
	class:face-up={shownFaceUp}
	style={`--page:url('${EXPORT_CARD_SPINE.page}')`}
	aria-pressed={faceUp}
	aria-label={label}
	{disabled}
	data-test="export-card"
	onclick={onToggle}
>
	<div class="flip" bind:this={flipEl}>
		<span class="face face--front" style={exportCardFaceStyle('front')}></span>
		<span class="fs" aria-hidden="true">
			<span class="fs__value">{freeSpins}</span>
			<span class="fs__label">{freeSpinsLabel}</span>
		</span>
		<span class="face face--back" style={exportCardFaceStyle('back')}></span>
	</div>
</button>

<style lang="scss">
	.export-card {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 553 / 853;
		padding: 0;
		border: 0;
		border-radius: 4.5%/3%;
		background: transparent;
		font-size: inherit;
		container-type: inline-size;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
		filter: drop-shadow(0 0.6em 1.2em rgba(0, 0, 0, 0.5));
		transition:
			transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
			filter 180ms ease-out;

		@media (hover: hover) and (pointer: fine) {
			&:hover:not(:disabled) {
				transform: translateY(-2.5%);
				filter: drop-shadow(0 0.9em 1.6em rgba(0, 0, 0, 0.55)) brightness(1.06);
			}
		}

		&:active:not(:disabled) {
			transform: scale(0.98);
		}

		&:disabled {
			cursor: default;
		}

		&:focus-visible {
			outline: 2px solid #ffd56a;
			outline-offset: 4px;
		}
	}

	.flip {
		position: absolute;
		inset: 0;
		will-change: transform;
	}

	.face {
		position: absolute;
		left: var(--face-left);
		top: var(--face-top);
		width: var(--face-width);
		height: var(--face-height);
		background-image: var(--page);
		background-repeat: no-repeat;
		background-size: var(--face-bg-size);
		background-position: var(--face-bg-pos);
		pointer-events: none;
	}

	/* Centred in the front-face oval (553×853 artboard, oval centre ≈ 45% height). */
	.fs {
		position: absolute;
		left: 50%;
		top: 45%;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 76%;
		transform: translate(-50%, -50%);
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		font-synthesis: none;
		line-height: 1;
		text-align: center;
		text-transform: uppercase;
		filter: drop-shadow(0 1px 0 #fff3b0) drop-shadow(0 3px 0 #5a3a0e)
			drop-shadow(0 6px 8px rgba(0, 0, 0, 0.55));
		pointer-events: none;
	}

	.fs__value,
	.fs__label {
		display: block;
		color: #ffe28a;
		background: linear-gradient(180deg, #fff6c8 0%, #ffd56a 38%, #e8a020 72%, #b8730f 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.fs__value {
		font-size: 36cqw;
		font-variant-numeric: tabular-nums lining-nums;
		letter-spacing: -0.02em;
	}

	.fs__label {
		max-width: 100%;
		margin-top: 2.5cqw;
		font-size: 8.5cqw;
		letter-spacing: 0.06em;
		line-height: 1.1;
		overflow-wrap: anywhere;
	}

	.face-up .fs {
		animation: fs-reveal 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	@keyframes fs-reveal {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.82);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
	}

	/* Spine draw order: `back` slot sits above `front` until the clip clears it. */
	.face--back {
		transition: opacity 120ms linear;
	}

	.face-up .face--back {
		opacity: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.export-card {
			transition: none;

			&:hover,
			&:active {
				transform: none;
			}
		}

		.face-up .fs {
			animation: none;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.face--back {
			transition: none;
		}
	}
</style>
