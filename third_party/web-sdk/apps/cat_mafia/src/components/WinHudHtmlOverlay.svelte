<!--
	Under-board WIN — proxima-nova + gold gradient (same face as FS intro
	CONGRATULATIONS). Anchored to the desk nameplate via getWinHudScreenBox.
	Count-up: fixed amount slot + tabular-nums so the label does not jitter.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { stateBet } from 'state-shared';
	import {
		bookEventAmountToNormalisedAmount,
		resolveWinCountUpFormat,
	} from 'utils-shared/amount';

	import { WIN_HUD_COUNT_UP_MS } from '../game/constants';
	import { getContext } from '../game/context';
	import { amountToLayoutParts } from '../game/currencyTextSegments';
	import { computeDuelScreenLayout, getDuelPixiBoardLayout } from '../game/duelLayout';
	import { devPreview } from '../game/devPreview.svelte';
	import { scaleMsByGameSpeed } from '../game/gameSpeed';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import { getWinHudScreenBox } from '../game/winHudLayout';

	const context = getContext();

	const LETTER_SPACING_EM = 0.08;

	/**
	 * While counting up, lock to the target's significant digit count so tween
	 * floats do not invent millionths. Idle: significant (trim trailing zeros).
	 */
	let countUpFractionDigits = $state<number | null>(null);

	/** Prefix + amount split — amount sits in a locked-width slot during count-up. */
	const formatWinParts = (
		bookAmount: number,
		prefix: string,
		lockedDigits: number | null = countUpFractionDigits,
	) => {
		const forced = devPreview.winForceFractionDigits;
		const digits = forced ?? lockedDigits;
		const parts = amountToLayoutParts(bookAmount, {
			bookEvent: true,
			prefix,
			fractionDigits: digits,
			significant: digits == null,
		});
		return {
			prefix: parts.label.trim(),
			amount: `${parts.before}${parts.symbol}${parts.after}`,
		};
	};

	const planCountUp = (fromBook: number, toBook: number) => {
		if (devPreview.winForceFractionDigits != null) {
			return {
				fractionDigits: devPreview.winForceFractionDigits,
				canAnimate: true,
			};
		}
		return resolveWinCountUpFormat(
			bookEventAmountToNormalisedAmount(fromBook),
			bookEventAmountToNormalisedAmount(toBook),
		);
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

	/** Keep amount slot ≥ widest of live / tween-target / book target (no shrink jitter). */
	const amountSlotPx = (
		liveBook: number,
		targetBook: number,
		fontSize: number,
		prefix: string,
		lockedDigits: number | null = null,
	) => {
		const live = formatWinParts(liveBook, prefix, lockedDigits).amount;
		const end = formatWinParts(targetBook, prefix, lockedDigits).amount;
		return Math.max(measureAmountPx(live, fontSize), measureAmountPx(end, fontSize));
	};

	/** Gap between prefix and amount — must match `.win-hud-text` CSS gap. */
	const PREFIX_AMOUNT_GAP_EM = 0.35;
	/**
	 * Uniform fit: shrink prefix + amount together (same font-size) so the full
	 * string stays inside maxWidth without clipping either side.
	 */
	const fitFontSize = (
		maxWidth: number,
		baseFontSize: number,
		liveBook: number,
		targetBook: number,
		prefix: string,
		lockedDigits: number | null = null,
	) => {
		if (baseFontSize <= 0 || maxWidth <= 0) return 0;
		const parts = formatWinParts(Math.max(liveBook, targetBook), prefix, lockedDigits);
		const prefixW = parts.prefix ? measureAmountPx(parts.prefix, baseFontSize) : 0;
		const amountW = amountSlotPx(liveBook, targetBook, baseFontSize, prefix, lockedDigits);
		const gapW = parts.prefix ? baseFontSize * PREFIX_AMOUNT_GAP_EM : 0;
		const total = prefixW + gapW + amountW;
		if (total <= 0) return baseFontSize;
		const scale = Math.min(1, maxWidth / total);
		return Math.max(10, baseFontSize * scale);
	};

	let uiVisible = $state(true);
	context.eventEmitter.subscribeOnMount({
		uiShow: () => {
			uiVisible = true;
		},
		uiHide: () => {
			uiVisible = false;
		},
	});

	const ml = $derived(context.stateLayoutDerived.mainLayout());
	const baseBoard = $derived(context.stateGameDerived.baseBoardLayout());
	const duelActive = $derived(stateDuel.active);

	const duelLayouts = $derived.by(() => {
		if (!duelActive) return null;
		const canvas = context.stateLayoutDerived.canvasSizes();
		const duel = computeDuelScreenLayout({
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
			layoutType: context.stateLayoutDerived.layoutType(),
			mainLayout: ml,
			boardLayout: baseBoard,
		});
		const sideLayout = (side: DuelSide) =>
			getDuelPixiBoardLayout({
				duel,
				side,
				mainLayout: ml,
				base: baseBoard,
			});
		return { cat: sideLayout('cat'), dog: sideLayout('dog') };
	});

	const baseBox = $derived(
		getWinHudScreenBox({
			mainLayout: ml,
			boardLayout: context.stateGameDerived.boardLayout(),
		}),
	);
	const dogBox = $derived(
		duelLayouts
			? getWinHudScreenBox({ mainLayout: ml, boardLayout: duelLayouts.dog })
			: null,
	);
	const catBox = $derived(
		duelLayouts
			? getWinHudScreenBox({ mainLayout: ml, boardLayout: duelLayouts.cat })
			: null,
	);

	/**
	 * Under-board WIN: snap by default. Book handlers set `winHudCountUpPending`
	 * for bonus FS (any increase) or base post-SW — we tween that increase.
	 * `untrack(from)` so tween frames do not re-enter this effect and snap.
	 * Digit lock: count-up uses the target's significant dp only (no float noise).
	 */
	const winTween = new Tween(stateBet.winBookEventAmount);
	let winTweenTarget: number | null = null;
	$effect(() => {
		if (duelActive) return;
		const target = stateBet.winBookEventAmount;
		const wantCountUp = stateGame.winHudCountUpPending;
		const from = untrack(() => winTween.current);

		if (target <= 0 || target + 0.01 < from) {
			if (wantCountUp && target <= 0 && from <= 0) return;
			if (stateGame.winHudCountUpPending) stateGame.winHudCountUpPending = false;
			winTweenTarget = null;
			countUpFractionDigits = null;
			winTween.set(target, { duration: 0 });
			return;
		}

		if (wantCountUp && target > from + 0.01) {
			stateGame.winHudCountUpPending = false;
			const plan = planCountUp(from, target);
			if (!plan.canAnimate) {
				winTweenTarget = null;
				countUpFractionDigits = null;
				winTween.set(target, { duration: 0 });
				return;
			}
			winTweenTarget = target;
			countUpFractionDigits = plan.fractionDigits;
			winTween.set(target, {
				duration: scaleMsByGameSpeed(WIN_HUD_COUNT_UP_MS, stateGame.gameSpeed),
			});
			return;
		}

		if (winTweenTarget != null && Math.abs(target - winTweenTarget) < 0.01) return;

		winTweenTarget = null;
		countUpFractionDigits = null;
		winTween.set(target, { duration: 0 });
	});

	const showBaseWin = $derived(
		!duelActive &&
			gameEntrance.showContent &&
			(stateBet.winBookEventAmount > 0 || winTween.current > 0),
	);

	const dogTween = new Tween(stateDuel.dogTotal);
	const catTween = new Tween(stateDuel.catTotal);
	let dogTweenTarget: number | null = null;
	let catTweenTarget: number | null = null;
	let dogCountUpDigits = $state<number | null>(null);
	let catCountUpDigits = $state<number | null>(null);

	const runSideTween = (
		side: DuelSide,
		tween: Tween<number>,
		target: number,
		wantCountUp: boolean,
		marked: number | null,
		setMarked: (v: number | null) => void,
		setDigits: (v: number | null) => void,
	) => {
		const from = untrack(() => tween.current);

		const clearFlag = () => {
			if (!stateDuel.winHudCountUpPendingBySide[side]) return;
			stateDuel.winHudCountUpPendingBySide[side] = false;
		};

		if (target <= 0 || target + 0.01 < from) {
			clearFlag();
			setMarked(null);
			setDigits(null);
			tween.set(target, { duration: 0 });
			return;
		}

		if (wantCountUp && target > from + 0.01) {
			clearFlag();
			const plan = planCountUp(from, target);
			if (!plan.canAnimate) {
				setMarked(null);
				setDigits(null);
				tween.set(target, { duration: 0 });
				return;
			}
			setMarked(target);
			setDigits(plan.fractionDigits);
			tween.set(target, {
				duration: scaleMsByGameSpeed(WIN_HUD_COUNT_UP_MS, stateGame.gameSpeed),
			});
			return;
		}

		if (marked != null && Math.abs(target - marked) < 0.01) return;

		setMarked(null);
		setDigits(null);
		tween.set(target, { duration: 0 });
	};

	$effect(() => {
		if (!duelActive) return;
		runSideTween(
			'dog',
			dogTween,
			stateDuel.dogTotal,
			stateDuel.winHudCountUpPendingBySide.dog,
			dogTweenTarget,
			(v) => {
				dogTweenTarget = v;
			},
			(v) => {
				dogCountUpDigits = v;
			},
		);
	});
	$effect(() => {
		if (!duelActive) return;
		runSideTween(
			'cat',
			catTween,
			stateDuel.catTotal,
			stateDuel.winHudCountUpPendingBySide.cat,
			catTweenTarget,
			(v) => {
				catTweenTarget = v;
			},
			(v) => {
				catCountUpDigits = v;
			},
		);
	});

	const showDuelWin = $derived(duelActive && gameEntrance.showContent);

	const winPrefix = $derived(context.i18nDerived.win().toUpperCase());

	const baseParts = $derived(formatWinParts(winTween.current, winPrefix, countUpFractionDigits));
	const dogParts = $derived(formatWinParts(dogTween.current, winPrefix, dogCountUpDigits));
	const catParts = $derived(formatWinParts(catTween.current, winPrefix, catCountUpDigits));

	const baseFontSize = $derived(
		baseBox
			? fitFontSize(
					baseBox.maxWidth,
					baseBox.fontSize,
					winTween.current,
					winTweenTarget ?? stateBet.winBookEventAmount,
					winPrefix,
					countUpFractionDigits,
				)
			: 0,
	);
	const dogFontSize = $derived(
		dogBox
			? fitFontSize(
					dogBox.maxWidth,
					dogBox.fontSize,
					dogTween.current,
					dogTweenTarget ?? stateDuel.dogTotal,
					winPrefix,
					dogCountUpDigits,
				)
			: 0,
	);
	const catFontSize = $derived(
		catBox
			? fitFontSize(
					catBox.maxWidth,
					catBox.fontSize,
					catTween.current,
					catTweenTarget ?? stateDuel.catTotal,
					winPrefix,
					catCountUpDigits,
				)
			: 0,
	);

	const baseAmountMinW = $derived(
		amountSlotPx(
			winTween.current,
			winTweenTarget ?? stateBet.winBookEventAmount,
			baseFontSize,
			winPrefix,
			countUpFractionDigits,
		),
	);
	const dogAmountMinW = $derived(
		dogBox
			? amountSlotPx(
					dogTween.current,
					dogTweenTarget ?? stateDuel.dogTotal,
					dogFontSize,
					winPrefix,
					dogCountUpDigits,
				)
			: 0,
	);
	const catAmountMinW = $derived(
		catBox
			? amountSlotPx(
					catTween.current,
					catTweenTarget ?? stateDuel.catTotal,
					catFontSize,
					winPrefix,
					catCountUpDigits,
				)
			: 0,
	);
</script>

{#if showBaseWin && baseBox}
	<div
		class="win-hud"
		class:hidden={!uiVisible}
		style:left="{baseBox.centerX}px"
		style:top="{baseBox.centerY}px"
		style:max-width="{baseBox.maxWidth}px"
		style:font-size="{baseFontSize}px"
		aria-hidden="true"
	>
		<span class="win-hud-text">
			{#if baseParts.prefix}
				<span class="win-hud-prefix">{baseParts.prefix}</span>
			{/if}
			<span class="win-hud-amount" style:min-width="{baseAmountMinW}px">{baseParts.amount}</span>
		</span>
	</div>
{/if}

{#if showDuelWin && dogBox && catBox}
	<div
		class="win-hud"
		class:hidden={!uiVisible}
		style:left="{dogBox.centerX}px"
		style:top="{dogBox.centerY}px"
		style:max-width="{dogBox.maxWidth}px"
		style:font-size="{dogFontSize}px"
		aria-hidden="true"
	>
		<span class="win-hud-text">
			{#if dogParts.prefix}
				<span class="win-hud-prefix">{dogParts.prefix}</span>
			{/if}
			<span class="win-hud-amount" style:min-width="{dogAmountMinW}px">{dogParts.amount}</span>
		</span>
	</div>
	<div
		class="win-hud"
		class:hidden={!uiVisible}
		style:left="{catBox.centerX}px"
		style:top="{catBox.centerY}px"
		style:max-width="{catBox.maxWidth}px"
		style:font-size="{catFontSize}px"
		aria-hidden="true"
	>
		<span class="win-hud-text">
			{#if catParts.prefix}
				<span class="win-hud-prefix">{catParts.prefix}</span>
			{/if}
			<span class="win-hud-amount" style:min-width="{catAmountMinW}px">{catParts.amount}</span>
		</span>
	</div>
{/if}

<style lang="scss">
	.win-hud {
		position: fixed;
		z-index: 41;
		transform: translate(-50%, -50%);
		pointer-events: none;
		user-select: none;
		text-align: center;
		line-height: 1;
		opacity: 1;
		transition: opacity 200ms ease;
	}

	.win-hud.hidden {
		opacity: 0;
	}

	.win-hud-text {
		display: inline-flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.35em;
		max-width: 100%;
		white-space: nowrap;
		filter: drop-shadow(0 1px 0 #e8c878) drop-shadow(0 3px 0 #4a3008)
			drop-shadow(0 7px 10px rgba(0, 0, 0, 0.55));
	}

	.win-hud-prefix,
	.win-hud-amount {
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		font-synthesis: none;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		line-height: 1;
		color: #e8b84a;
		/* Slightly darker gold than FS intro Congratulations — WIN-only. */
		background: linear-gradient(180deg, #f0d070 0%, #e0a838 38%, #c07014 72%, #8a4e0c 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	/* Locked width + tabular digits → amount grows in place, prefix stays put. */
	.win-hud-amount {
		display: inline-block;
		flex: 0 0 auto;
		text-align: right;
		font-variant-numeric: tabular-nums lining-nums;
	}
</style>
