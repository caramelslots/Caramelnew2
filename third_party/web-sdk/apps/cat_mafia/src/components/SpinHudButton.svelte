<script lang="ts">
	import { HUD_ASSETS } from '../game/uiHtmlAssetManifest';

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

	const spinUrl = $derived(hasCounter ? HUD_ASSETS.spin2 : HUD_ASSETS.spin1);

	export function playAnimation() {
		pressed = true;
		clearTimeout(pressTimer);
		pressTimer = setTimeout(() => {
			pressed = false;
		}, 150);
	}
</script>

<button
	type="button"
	class="spin-hud-btn"
	class:dimmed
	class:pressed
	style:left="{x}px"
	style:top="{y}px"
	style:width="{size}px"
	style:height="{size}px"
	{disabled}
	aria-label={ariaLabel}
	onclick={onpress}
>
	<img class="spin-hud-btn__icon" src={spinUrl} alt="" draggable="false" />

	{#if hasCounter}
		<span class="spin-hud-btn__counter" style:font-size="{counterFontSize}px">{counterText}</span>
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
		transition: transform 0.1s, filter 0.15s, opacity 0.15s;

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
		width: 100%;
		height: 100%;
		object-fit: contain;
		pointer-events: none;
		user-select: none;
	}

	.spin-hud-btn__counter {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-family: 'proxima-nova', Arial, sans-serif;
		font-weight: 700;
		line-height: 1;
		pointer-events: none;
		user-select: none;
		transform: translateY(4%);
	}
</style>
