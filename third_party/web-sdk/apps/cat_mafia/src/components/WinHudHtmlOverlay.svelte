<!--
	Under-board WIN — proxima-nova + gold gradient (same face as FS intro
	CONGRATULATIONS). Anchored to the desk nameplate via getWinHudScreenBox.
-->
<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { stateBet } from 'state-shared';

	import { WIN_HUD_COUNT_UP_MS } from '../game/constants';
	import { getContext } from '../game/context';
	import { computeDuelScreenLayout, getDuelPixiBoardLayout } from '../game/duelLayout';
	import { scaleMsByGameSpeed } from '../game/gameSpeed';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import { getWinHudScreenBox } from '../game/winHudLayout';

	const context = getContext();

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

	/** Base-game under-board WIN count-up. */
	const winTween = new Tween(stateBet.winBookEventAmount);
	let winTweenTarget: number | null = null;
	$effect(() => {
		if (duelActive) return;
		const target = stateBet.winBookEventAmount;
		const wantCountUp = stateGame.winHudCountUpPending;
		const from = winTween.current;

		if (target <= 0 || target + 0.01 < from) {
			if (wantCountUp && target <= 0 && from <= 0) return;
			if (stateGame.winHudCountUpPending) stateGame.winHudCountUpPending = false;
			winTweenTarget = null;
			winTween.set(target, { duration: 0 });
			return;
		}

		if (wantCountUp && target > from + 0.01) {
			stateGame.winHudCountUpPending = false;
			winTweenTarget = target;
			winTween.set(target, {
				duration: scaleMsByGameSpeed(WIN_HUD_COUNT_UP_MS, stateGame.gameSpeed),
			});
			return;
		}

		if (winTweenTarget != null && Math.abs(target - winTweenTarget) < 0.01) return;

		winTweenTarget = null;
		winTween.set(target, { duration: 0 });
	});

	const displayWin = $derived(Math.round(winTween.current));
	const showBaseWin = $derived(
		!duelActive &&
			gameEntrance.showContent &&
			(stateBet.winBookEventAmount > 0 || displayWin > 0),
	);

	/** Duel side-bank count-ups. */
	const dogTween = new Tween(0);
	const catTween = new Tween(0);
	let dogTweenTarget: number | null = null;
	let catTweenTarget: number | null = null;

	const runSideTween = (
		side: DuelSide,
		tween: Tween<number>,
		getTarget: () => number,
		getTweenTarget: () => number | null,
		setTweenTarget: (v: number | null) => void,
	) => {
		const target = getTarget();
		const wantCountUp = stateDuel.winHudCountUpPendingBySide[side];
		const from = tween.current;

		const clearFlag = () => {
			if (!stateDuel.winHudCountUpPendingBySide[side]) return;
			stateDuel.winHudCountUpPendingBySide[side] = false;
		};

		if (target <= 0 || target + 0.01 < from) {
			clearFlag();
			setTweenTarget(null);
			tween.set(target, { duration: 0 });
			return;
		}

		if (wantCountUp && target > from + 0.01) {
			clearFlag();
			setTweenTarget(target);
			tween.set(target, {
				duration: scaleMsByGameSpeed(WIN_HUD_COUNT_UP_MS, stateGame.gameSpeed),
			});
			return;
		}

		const marked = getTweenTarget();
		if (marked != null && Math.abs(target - marked) < 0.01) return;

		setTweenTarget(null);
		tween.set(target, { duration: 0 });
	};

	$effect(() => {
		if (!duelActive) return;
		runSideTween(
			'dog',
			dogTween,
			() => stateDuel.dogTotal,
			() => dogTweenTarget,
			(v) => {
				dogTweenTarget = v;
			},
		);
	});
	$effect(() => {
		if (!duelActive) return;
		runSideTween(
			'cat',
			catTween,
			() => stateDuel.catTotal,
			() => catTweenTarget,
			(v) => {
				catTweenTarget = v;
			},
		);
	});

	const displayDog = $derived(Math.round(dogTween.current));
	const displayCat = $derived(Math.round(catTween.current));
	const showDuelWin = $derived(duelActive && gameEntrance.showContent);

	const winPrefix = $derived(context.i18nDerived.win().toUpperCase());
	const formatWin = (amount: number) =>
		`${winPrefix} ${bookEventAmountToCurrencyString(amount)}`;

	const baseLabel = $derived(formatWin(displayWin));
	const dogLabel = $derived(formatWin(displayDog));
	const catLabel = $derived(formatWin(displayCat));
</script>

{#if showBaseWin && baseBox}
	<div
		class="win-hud"
		class:hidden={!uiVisible}
		style:left="{baseBox.centerX}px"
		style:top="{baseBox.centerY}px"
		style:max-width="{baseBox.maxWidth}px"
		style:font-size="{baseBox.fontSize}px"
		aria-hidden="true"
	>
		<span class="win-hud-text">{baseLabel}</span>
	</div>
{/if}

{#if showDuelWin && dogBox && catBox}
	<div
		class="win-hud"
		class:hidden={!uiVisible}
		style:left="{dogBox.centerX}px"
		style:top="{dogBox.centerY}px"
		style:max-width="{dogBox.maxWidth}px"
		style:font-size="{dogBox.fontSize}px"
		aria-hidden="true"
	>
		<span class="win-hud-text">{dogLabel}</span>
	</div>
	<div
		class="win-hud"
		class:hidden={!uiVisible}
		style:left="{catBox.centerX}px"
		style:top="{catBox.centerY}px"
		style:max-width="{catBox.maxWidth}px"
		style:font-size="{catBox.fontSize}px"
		aria-hidden="true"
	>
		<span class="win-hud-text">{catLabel}</span>
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

	/* Same face as FreeSpinIntro .congratulations / .number */
	.win-hud-text {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: 'proxima-nova', sans-serif;
		font-weight: 800;
		font-synthesis: none;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		line-height: 1;
		color: #ffe28a;
		background: linear-gradient(180deg, #fff6c8 0%, #ffd56a 38%, #e8a020 72%, #b8730f 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 1px 0 #fff3b0) drop-shadow(0 3px 0 #5a3a0e)
			drop-shadow(0 7px 10px rgba(0, 0, 0, 0.55));
	}
</style>
