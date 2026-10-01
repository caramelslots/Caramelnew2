<!--
	PaylineWinAmounts.svelte — single compact total above one payline.
	Stake small-win UX: one amount over any winning line, not per-line labels.
	Font: proxima-nova (same face as FS Intro CONGRATULATIONS / under-board WIN).
	Motion: drops onto the line, holds ~0.5s, then falls down (does not wait for payline clear).
-->
<script lang="ts" module>
	import type { Position } from '../game/types';

	export type PaylineWinAmountAnchor = {
		lineIndex: number;
		positions: Position[];
	};

	export type EmitterEventPaylineWinAmount =
		| {
				type: 'paylineWinAmountShow';
				amount: number;
				anchor: PaylineWinAmountAnchor;
				side?: 'cat' | 'dog';
		  }
		| { type: 'paylineWinAmountClear'; side?: 'cat' | 'dog' };
</script>

<script lang="ts">
	import { FillGradient } from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { backOut, cubicIn, cubicOut } from 'svelte/easing';
	import { Container } from 'pixi-svelte';

	import TightCanvasText from './TightCanvasText.svelte';

	import {
		PAYLINE_WIN_AMOUNT_ABOVE_LINE_OFFSET,
		PAYLINE_WIN_AMOUNT_DROP_PX,
		PAYLINE_WIN_AMOUNT_FALL_PX,
		PAYLINE_WIN_AMOUNT_FONT_SIZE,
		PAYLINE_WIN_AMOUNT_HOLD_MS,
		PAYLINE_WIN_AMOUNT_IN_MS,
		PAYLINE_WIN_AMOUNT_OUT_MS,
		SYMBOL_SIZE,
	} from '../game/constants';
	import { amountToLayoutParts } from '../game/currencyTextSegments';
	import { getContext } from '../game/context';
	import { scaleMsByGameSpeed, waitForGameSpeed } from '../game/gameSpeed';
	import { stateGame } from '../game/stateGame.svelte';
	import { getSymbolX } from '../game/utils';

	type Props = {
		side?: 'cat' | 'dog';
		/** Draw above win / SW symbols in the payline stack (BoardContainer sortableChildren). */
		zIndex?: number;
	};

	const props: Props = $props();
	const context = getContext();

	let activeAmount = $state<number | null>(null);
	let activeAnchor = $state<PaylineWinAmountAnchor | null>(null);
	let measuredWidth = $state(0);
	/** Keep mounted through the fall-out so clear is not an instant pop. */
	let mounted = $state(false);

	const yOff = new Tween(0);
	const popScale = new Tween(1);
	const alpha = new Tween(1);
	/** Bump to cancel an in-flight appear/dismiss when a new event arrives. */
	let motionGen = 0;

	/** Above BoardBase `abovePayline` symbols (z≈1) and SW badges nested under curtains. */
	const amountZ = $derived(props.zIndex ?? 50);

	/**
	 * Same vertical gold as under-board WIN (`WinHudHtmlOverlay`):
	 * linear-gradient(180deg, #f0d070 0%, #e0a838 38%, #c07014 72%, #8a4e0c 100%).
	 */
	const winHudGoldFill = new FillGradient({
		type: 'linear',
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		colorStops: [
			{ offset: 0, color: '#f0d070' },
			{ offset: 0.38, color: '#e0a838' },
			{ offset: 0.72, color: '#c07014' },
			{ offset: 1, color: '#8a4e0c' },
		],
		textureSpace: 'local',
	});

	const amountStyle = {
		fontFamily: 'proxima-nova, sans-serif',
		fontSize: PAYLINE_WIN_AMOUNT_FONT_SIZE,
		fontWeight: '800' as const,
		fill: winHudGoldFill,
		align: 'center' as const,
		// Match under-board WIN tracking (0.08em).
		letterSpacing: PAYLINE_WIN_AMOUNT_FONT_SIZE * 0.08,
		// Approximate Win HUD stack: light rim + dark step + soft falloff.
		dropShadow: {
			color: '#4a3008',
			alpha: 0.95,
			blur: 3,
			distance: 3,
			angle: Math.PI / 2,
		},
	};

	const displayText = $derived.by(() => {
		if (activeAmount == null) return '';
		const parts = amountToLayoutParts(activeAmount, {
			bookEvent: true,
			significant: true,
		});
		return `${parts.before}${parts.symbol}${parts.after}`;
	});

	const anchorLayout = $derived.by(() => {
		if (!activeAnchor) return null;

		const centers = activeAnchor.positions.map((p) => ({
			x: getSymbolX(p.reel),
			y: SYMBOL_SIZE * (p.row - 0.5),
		}));
		const x = centers.reduce((sum, c) => sum + c.x, 0) / centers.length;
		const y =
			centers.reduce((sum, c) => sum + c.y, 0) / centers.length -
			PAYLINE_WIN_AMOUNT_ABOVE_LINE_OFFSET;
		const maxWidth = SYMBOL_SIZE * Math.max(activeAnchor.positions.length, 3) * 1.6;
		return { x, y, maxWidth };
	});

	const fitScale = $derived.by(() => {
		if (!anchorLayout || measuredWidth <= 0) return 1;
		return Math.min(1, anchorLayout.maxWidth / measuredWidth);
	});

	const drawScale = $derived(fitScale * popScale.current);

	const playDropIn = async () => {
		const gen = ++motionGen;
		const ms = scaleMsByGameSpeed(PAYLINE_WIN_AMOUNT_IN_MS, stateGame.gameSpeed);
		await Promise.all([
			yOff.set(-PAYLINE_WIN_AMOUNT_DROP_PX, { duration: 0 }),
			popScale.set(0.7, { duration: 0 }),
			alpha.set(0, { duration: 0 }),
		]);
		if (gen !== motionGen) return;
		void alpha.set(1, { duration: Math.round(ms * 0.4), easing: cubicOut });
		void popScale.set(1, { duration: ms, easing: backOut });
		await yOff.set(0, { duration: ms, easing: backOut });
		if (gen !== motionGen) return;
		// Rest on the line briefly, then leave on its own (don't wait for payline clear).
		await waitForGameSpeed(PAYLINE_WIN_AMOUNT_HOLD_MS, stateGame.gameSpeed);
		if (gen !== motionGen) return;
		await playJumpOut(gen);
	};

	const playJumpOut = async (existingGen?: number) => {
		const gen = existingGen ?? ++motionGen;
		if (existingGen == null) motionGen = gen;
		const ms = scaleMsByGameSpeed(PAYLINE_WIN_AMOUNT_OUT_MS, stateGame.gameSpeed);
		void alpha.set(0, { duration: Math.round(ms * 0.9), easing: cubicIn });
		void popScale.set(0.82, { duration: ms, easing: cubicIn });
		await yOff.set(PAYLINE_WIN_AMOUNT_FALL_PX, { duration: ms, easing: cubicIn });
		if (gen !== motionGen) return;
		mounted = false;
		activeAmount = null;
		activeAnchor = null;
		measuredWidth = 0;
	};

	const matchesSide = (side: 'cat' | 'dog' | undefined) => {
		if (props.side) {
			if (side) return side === props.side;
			// Global clear (no side) still clears this desk.
			return true;
		}
		// Base board ignores duel-scoped events.
		return !side;
	};

	const clearAnimated = () => {
		if (!mounted) {
			activeAmount = null;
			activeAnchor = null;
			measuredWidth = 0;
			return;
		}
		void playJumpOut();
	};

	context.eventEmitter.subscribeOnMount({
		paylineWinAmountShow: (event) => {
			if (props.side) {
				if (event.side !== props.side) return;
			} else if (event.side) {
				return;
			}
			measuredWidth = 0;
			activeAmount = event.amount;
			activeAnchor = event.anchor;
			mounted = true;
			void playDropIn();
		},
		paylineWinAmountClear: (event) => {
			const side = event && 'side' in event ? event.side : undefined;
			if (!matchesSide(side)) return;
			clearAnimated();
		},
		paylineClearAll: (event) => {
			const side = event && 'side' in event ? event.side : undefined;
			if (side) {
				if (props.side !== side) return;
			}
			clearAnimated();
		},
	});
</script>

{#if mounted && activeAmount != null && activeAnchor && anchorLayout && displayText}
	{#key displayText}
		<Container
			x={anchorLayout.x}
			y={anchorLayout.y + yOff.current}
			zIndex={amountZ}
			alpha={alpha.current}
			eventMode="none"
		>
			<Container scale={drawScale}>
				<TightCanvasText
					text={displayText}
					anchor={0.5}
					style={amountStyle}
					onresize={(s) => {
						measuredWidth = s.width;
					}}
				/>
			</Container>
		</Container>
	{/key}
{/if}
