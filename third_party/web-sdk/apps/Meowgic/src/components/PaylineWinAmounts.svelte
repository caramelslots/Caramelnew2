<!--
	PaylineWinAmounts.svelte — single compact total above one payline.
	Stake small-win UX: one amount over any winning line, not per-line labels.
	Font: proxima-nova (same face as FS Intro CONGRATULATIONS / under-board WIN).
	Motion: fast fade-in with a scale pop (overshoot, then settle), steady upward drift for the
	whole lifetime, then fades out while still drifting (does not wait for payline clear).
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
	import { cubicInOut, cubicOut, linear, sineIn } from 'svelte/easing';
	import { Container } from 'pixi-svelte';

	import TightCanvasText from './TightCanvasText.svelte';

	import {
		PAYLINE_WIN_AMOUNT_ABOVE_LINE_OFFSET,
		PAYLINE_WIN_AMOUNT_DRIFT_PX_PER_S,
		PAYLINE_WIN_AMOUNT_FADE_IN_MS,
		PAYLINE_WIN_AMOUNT_FONT_SIZE,
		PAYLINE_WIN_AMOUNT_HOLD_MS,
		PAYLINE_WIN_AMOUNT_OUT_MS,
		PAYLINE_WIN_AMOUNT_POP_PEAK_SCALE,
		PAYLINE_WIN_AMOUNT_POP_SETTLE_MS,
		PAYLINE_WIN_AMOUNT_POP_START_SCALE,
		PAYLINE_WIN_AMOUNT_POP_UP_MS,
		PAYLINE_WIN_AMOUNT_SWAY_PERIOD_MS,
		PAYLINE_WIN_AMOUNT_SWAY_TILT_DECAY_MS,
		PAYLINE_WIN_AMOUNT_SWAY_TILT_REST_DEG,
		PAYLINE_WIN_AMOUNT_SWAY_TILT_START_DEG,
		PAYLINE_WIN_AMOUNT_SWAY_X_PX,
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

	/** Elapsed sway time in unscaled ms (game speed applied per frame). */
	let swayMs = $state(0);

	$effect(() => {
		if (!mounted) return;
		swayMs = 0;
		let last = performance.now();
		let raf = requestAnimationFrame(function tick(now) {
			const speedFactor = PAYLINE_WIN_AMOUNT_SWAY_PERIOD_MS / Math.max(1, speedMs(PAYLINE_WIN_AMOUNT_SWAY_PERIOD_MS));
			swayMs += (now - last) * speedFactor;
			last = now;
			raf = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(raf);
	});

	const swayPhase = $derived((swayMs / PAYLINE_WIN_AMOUNT_SWAY_PERIOD_MS) * Math.PI * 2);
	const swayX = $derived(PAYLINE_WIN_AMOUNT_SWAY_X_PX * Math.sin(swayPhase));
	const swayRotation = $derived.by(() => {
		const decay = Math.exp(-swayMs / PAYLINE_WIN_AMOUNT_SWAY_TILT_DECAY_MS);
		const deg =
			PAYLINE_WIN_AMOUNT_SWAY_TILT_REST_DEG +
			(PAYLINE_WIN_AMOUNT_SWAY_TILT_START_DEG - PAYLINE_WIN_AMOUNT_SWAY_TILT_REST_DEG) * decay;
		return ((deg * Math.PI) / 180) * Math.cos(swayPhase);
	});

	const speedMs = (ms: number) => scaleMsByGameSpeed(ms, stateGame.gameSpeed);

	/** Takes unscaled ms so the drift path is identical at every game speed. */
	const driftPx = (ms: number) => (PAYLINE_WIN_AMOUNT_DRIFT_PX_PER_S * ms) / 1000;

	const playAppear = async () => {
		const gen = ++motionGen;
		const lifeBaseMs =
			PAYLINE_WIN_AMOUNT_POP_UP_MS + PAYLINE_WIN_AMOUNT_POP_SETTLE_MS + PAYLINE_WIN_AMOUNT_HOLD_MS;
		const popUpMs = speedMs(PAYLINE_WIN_AMOUNT_POP_UP_MS);
		const settleMs = speedMs(PAYLINE_WIN_AMOUNT_POP_SETTLE_MS);
		const lifeMs = speedMs(lifeBaseMs);
		await Promise.all([
			yOff.set(0, { duration: 0 }),
			popScale.set(PAYLINE_WIN_AMOUNT_POP_START_SCALE, { duration: 0 }),
			alpha.set(0, { duration: 0 }),
		]);
		if (gen !== motionGen) return;
		void yOff.set(-driftPx(lifeBaseMs), { duration: lifeMs, easing: linear });
		void alpha.set(1, { duration: speedMs(PAYLINE_WIN_AMOUNT_FADE_IN_MS), easing: cubicOut });
		await popScale.set(PAYLINE_WIN_AMOUNT_POP_PEAK_SCALE, { duration: popUpMs, easing: cubicOut });
		if (gen !== motionGen) return;
		await popScale.set(1, { duration: settleMs, easing: cubicInOut });
		if (gen !== motionGen) return;
		// Leave on its own (don't wait for payline clear).
		await waitForGameSpeed(PAYLINE_WIN_AMOUNT_HOLD_MS, stateGame.gameSpeed);
		if (gen !== motionGen) return;
		await playFadeOut(gen);
	};

	const playFadeOut = async (existingGen?: number) => {
		const gen = existingGen ?? ++motionGen;
		if (existingGen == null) motionGen = gen;
		const ms = speedMs(PAYLINE_WIN_AMOUNT_OUT_MS);
		void yOff.set(yOff.current - driftPx(PAYLINE_WIN_AMOUNT_OUT_MS), { duration: ms, easing: linear });
		await alpha.set(0, { duration: ms, easing: sineIn });
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
		void playFadeOut();
	};

	context.eventEmitter.subscribeOnMount({
		paylineWinAmountShow: (event) => {
			if (props.side) {
				if (event.side !== props.side) return;
			} else if (event.side) {
				return;
			}
			measuredWidth = 0;
			swayMs = 0;
			activeAmount = event.amount;
			activeAnchor = event.anchor;
			mounted = true;
			void playAppear();
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
			x={anchorLayout.x + swayX}
			y={anchorLayout.y + yOff.current}
			zIndex={amountZ}
			alpha={alpha.current}
			eventMode="none"
		>
			<Container scale={drawScale} rotation={swayRotation}>
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
