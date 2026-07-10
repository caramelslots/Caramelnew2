<script lang="ts">
	import SpinButtonHtmlSpine from './SpinButtonHtmlSpine.svelte';

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

	let spine = $state<SpinButtonHtmlSpine | undefined>();

	export function playAnimation() {
		spine?.playPress();
	}
</script>

<button
	type="button"
	class="spin-hud-btn"
	class:dimmed
	style:left="{x}px"
	style:top="{y}px"
	style:width="{size}px"
	style:height="{size}px"
	{disabled}
	aria-label={ariaLabel}
	onclick={onpress}
>
	<SpinButtonHtmlSpine bind:this={spine} />

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

		&:active:not(:disabled) {
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

	.spin-hud-btn__counter {
		position: relative;
		z-index: 1;
		color: #fff;
		font-family: 'proxima-nova', Arial, sans-serif;
		font-weight: 700;
		line-height: 1;
		pointer-events: none;
		user-select: none;
		transform: translateY(4%);
	}
</style>
