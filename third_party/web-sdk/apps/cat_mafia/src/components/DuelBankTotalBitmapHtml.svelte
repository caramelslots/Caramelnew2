<!--
	Duel scale plaque total — HTML text above the scale art (z-index).
	proxima-nova like under-board WIN; count-up without jitter (locked amount slot).
	Never reads WebGL pixels.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';

	import { WIN_HUD_COUNT_UP_MS } from '../game/constants';
	import { amountToLayoutParts } from '../game/currencyTextSegments';
	import { devPreview } from '../game/devPreview.svelte';
	import { scaleMsByGameSpeed } from '../game/gameSpeed';
	import { stateGame } from '../game/stateGame.svelte';

	type Props = {
		amount: number;
		prefix: string;
		maxWidth: number;
		maxHeight: number;
	};

	const props: Props = $props();

	/** Same tracking as under-board WIN (`WinHudHtmlOverlay`). */
	const LETTER_SPACING_EM = 0.08;

	const formatParts = (bookAmount: number) => {
		const parts = amountToLayoutParts(bookAmount, {
			bookEvent: true,
			prefix: props.prefix,
			fractionDigits: devPreview.winForceFractionDigits,
		});
		return {
			prefix: parts.label.trim(),
			amount: `${parts.before}${parts.symbol}${parts.after}`,
		};
	};

	const measureAmountPx = (text: string, fontSize: number) => {
		if (typeof document === 'undefined' || fontSize <= 0 || !text) return 0;
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return text.length * fontSize * 0.55;
		ctx.font = `800 ${fontSize}px proxima-nova, sans-serif`;
		const base = ctx.measureText(text).width;
		const tracking = Math.max(0, text.length - 1) * fontSize * LETTER_SPACING_EM;
		return Math.ceil(base + tracking);
	};

	const amountTween = new Tween(props.amount);
	let tweenTarget: number | null = null;
	$effect(() => {
		const target = props.amount;
		const from = untrack(() => amountTween.current);
		if (target <= 0 || target + 0.01 < from) {
			tweenTarget = null;
			amountTween.set(target, { duration: 0 });
			return;
		}
		if (target > from + 0.01) {
			tweenTarget = target;
			amountTween.set(target, {
				duration: scaleMsByGameSpeed(WIN_HUD_COUNT_UP_MS, stateGame.gameSpeed),
			});
			return;
		}
		tweenTarget = null;
		amountTween.set(target, { duration: 0 });
	});

	const parts = $derived(formatParts(amountTween.current));
	const fitW = $derived(Math.max(0, Math.floor(props.maxWidth)));
	const fitH = $derived(Math.max(0, Math.floor(props.maxHeight)));
	const fontSize = $derived(Math.max(10, Math.floor(fitH * 0.62)));
	const amountMinW = $derived(
		Math.max(
			measureAmountPx(parts.amount, fontSize),
			measureAmountPx(formatParts(tweenTarget ?? props.amount).amount, fontSize),
		),
	);
	const rowStyle = $derived(`max-width:${fitW}px;font-size:${fontSize}px;`);
</script>

<span class="duel-bank-total" style={rowStyle}>
	{#if parts.prefix}
		<span class="duel-bank-prefix">{parts.prefix}</span>
	{/if}
	<span class="duel-bank-amount" style:min-width="{amountMinW}px">{parts.amount}</span>
</span>

<style lang="scss">
	/* Match under-board WIN face exactly (`WinHudHtmlOverlay`). */
	.duel-bank-total {
		display: inline-flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.35em;
		max-width: 100%;
		overflow: hidden;
		white-space: nowrap;
		pointer-events: none;
		user-select: none;
		filter: drop-shadow(0 1px 0 #e8c878) drop-shadow(0 3px 0 #4a3008)
			drop-shadow(0 7px 10px rgba(0, 0, 0, 0.55));
	}

	.duel-bank-prefix,
	.duel-bank-amount {
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		font-synthesis: none;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		line-height: 1;
		color: #e8b84a;
		background: linear-gradient(180deg, #f0d070 0%, #e0a838 38%, #c07014 72%, #8a4e0c 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.duel-bank-amount {
		display: inline-block;
		flex: 0 0 auto;
		text-align: right;
		font-variant-numeric: tabular-nums lining-nums;
	}
</style>
