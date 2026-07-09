<!--
	PaylineWinAmounts.svelte — single compact prostoi total above one payline.
	Stake small-win UX: one amount over any winning line, not per-line labels.
-->
<script lang="ts" module>
	import type { Position } from '../game/types';

	export type PaylineWinAmountAnchor = {
		lineIndex: number;
		positions: Position[];
	};

	export type EmitterEventPaylineWinAmount =
		| { type: 'paylineWinAmountShow'; amount: number; anchor: PaylineWinAmountAnchor }
		| { type: 'paylineWinAmountClear' };
</script>

<script lang="ts">
	import ResponsiveCurrencyBitmapText from './ResponsiveCurrencyBitmapText.svelte';

	import {
		BITMAP_FONT_SCALE,
		PAYLINE_WIN_AMOUNT_ABOVE_LINE_OFFSET,
		PAYLINE_WIN_AMOUNT_FONT_SIZE,
		SYMBOL_SIZE,
	} from '../game/constants';
	import { getContext } from '../game/context';

	const context = getContext();

	let activeAmount = $state<number | null>(null);
	let activeAnchor = $state<PaylineWinAmountAnchor | null>(null);

	const amountStyle = {
		fontSize: PAYLINE_WIN_AMOUNT_FONT_SIZE * BITMAP_FONT_SCALE,
		align: 'center' as const,
		fontWeight: 'bold' as const,
		letterSpacing: 0,
	};

	const anchorLayout = $derived.by(() => {
		if (!activeAnchor) return null;

		const centers = activeAnchor.positions.map((p) => ({
			x: SYMBOL_SIZE * (p.reel + 0.5),
			y: SYMBOL_SIZE * (p.row - 0.5),
		}));
		const x = centers.reduce((sum, c) => sum + c.x, 0) / centers.length;
		const y =
			centers.reduce((sum, c) => sum + c.y, 0) / centers.length -
			PAYLINE_WIN_AMOUNT_ABOVE_LINE_OFFSET;
		const maxWidth = SYMBOL_SIZE * Math.max(activeAnchor.positions.length, 3) * 1.6;
		return { x, y, maxWidth };
	});

	context.eventEmitter.subscribeOnMount({
		paylineWinAmountShow: ({ amount, anchor }) => {
			activeAmount = amount;
			activeAnchor = anchor;
		},
		paylineWinAmountClear: () => {
			activeAmount = null;
			activeAnchor = null;
		},
		paylineClearAll: () => {
			activeAmount = null;
			activeAnchor = null;
		},
	});
</script>

{#if activeAmount != null && activeAnchor && anchorLayout}
	<ResponsiveCurrencyBitmapText
		anchor={0.5}
		eventMode="none"
		x={anchorLayout.x}
		y={anchorLayout.y}
		amount={activeAmount}
		bookEvent
		bodyFontVariant="prostoi"
		maxWidth={anchorLayout.maxWidth}
		style={amountStyle}
	/>
{/if}
