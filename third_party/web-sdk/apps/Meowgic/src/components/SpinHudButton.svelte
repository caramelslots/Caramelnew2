<script lang="ts">
	import { HUD_ASSETS } from '../game/uiHtmlAssetManifest';
	import {
		spinButtonDimmed,
		spinButtonPixiReady,
		spinButtonSpineActive,
		triggerSpinButtonPress,
	} from '../game/spinButtonPixi.svelte';

	type Props = {
		x: number;
		y: number;
		size: number;
		dimmed?: boolean;
		disabled?: boolean;
		ariaLabel?: string;
		onpress?: () => void;
		hasCounter?: boolean;
		counterText?: string;
		counterFontSize?: number;
	};

	const {
		x,
		y,
		size,
		dimmed = false,
		disabled = false,
		ariaLabel = 'spin',
		onpress,
		hasCounter = false,
		counterText = '',
		counterFontSize = 16,
	}: Props = $props();

	let pressed = $state(false);
	let pressTimer: ReturnType<typeof setTimeout> | undefined;

	const pixiReady = $derived(spinButtonPixiReady.value);
	/** Hide static art only while the spine clip is active — keeps appear from flashing. */
	const hideStaticArt = $derived(spinButtonSpineActive.value);
	/** Dim exactly one visible surface — never HTML opacity × Pixi alpha (looked like 3 shades). */
	const dimHtml = $derived(dimmed && !hideStaticArt);
	const dimPixi = $derived(dimmed && hideStaticArt);

	$effect(() => {
		spinButtonDimmed.value = dimPixi;
	});

	export function playAnimation() {
		// Always drive Pixi from press/autoplay — sync must not auto-start on mount.
		triggerSpinButtonPress();
		if (hasCounter) {
			pressed = true;
			clearTimeout(pressTimer);
			pressTimer = setTimeout(() => {
				pressed = false;
			}, 150);
		}
	}
</script>

<button
	type="button"
	class="spin-hud-btn"
	class:dimmed={dimHtml}
	class:pressed
	class:pixi-live={pixiReady}
	style:left="{x}px"
	style:top="{y}px"
	style:width="{size}px"
	style:height="{size}px"
	{disabled}
	aria-label={ariaLabel}
	onclick={onpress}
	data-spin-pixi-ready={pixiReady}
>
	<!-- Idle = static art (no HTML↔Pixi swap flash on enter). Hidden only during spine clip. -->
	<img
		class="spin-hud-btn__icon"
		class:under-pixi={hideStaticArt}
		src={hasCounter ? HUD_ASSETS.spin2 : HUD_ASSETS.spin1}
		alt=""
		draggable="false"
	/>
	{#if hasCounter}
		<!-- Counter sits above Pixi spin (or fallback art) during autoplay. -->
		<span
			class="spin-hud-btn__counter"
			class:dimmed={dimPixi}
			style:font-size="{counterFontSize}px"
		>{counterText}</span>
	{/if}
</button>

<style lang="scss">
	.spin-hud-btn {
		position: absolute;
		transform: translate(-50%, -50%);
		border: 0;
		padding: 0;
		background: transparent;
		cursor: pointer;
		pointer-events: auto;
		overflow: visible;
		display: flex;
		align-items: center;
		justify-content: center;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
		transition:
			transform 0.1s,
			filter 0.15s;

		&:active:not(:disabled),
		&.pressed {
			transform: translate(-50%, -50%) scale(0.97);
			filter: brightness(0.9);
		}

		&:disabled {
			cursor: not-allowed;
			pointer-events: none;
		}

		&.dimmed {
			opacity: 0.45;
		}
	}

	.spin-hud-btn__icon {
		position: absolute;
		inset: 0;
		z-index: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		pointer-events: none;
		user-select: none;

		&.under-pixi {
			opacity: 0;
		}
	}

	.spin-hud-btn__counter {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-family: 'proxima-nova', Arial, sans-serif;
		font-weight: 700;
		line-height: 1;
		pointer-events: none;
		user-select: none;
		transform: translateY(-2%);
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);

		&.dimmed {
			opacity: 0.45;
		}
	}
</style>
