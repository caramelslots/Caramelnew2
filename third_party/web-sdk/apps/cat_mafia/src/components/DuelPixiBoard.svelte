<!--
	One Duel desk layer. Game.svelte mounts base → board → overlay →
	idleBounce → superWild → nameplate → paylines → win for both sides so
	cat's desk never paints over dog's reels.
-->
<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventDuelBoard = {
		type: 'duelBoardAnimateSymbols';
		side: 'cat' | 'dog';
		symbolPositions: Position[];
	};

	export type DuelPixiBoardLayer =
		| 'base'
		| 'board'
		| 'overlay'
		| 'nameplate'
		| 'idleBounce'
		| 'superWild'
		| 'paylines'
		| 'win';
</script>

<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { Container, Graphics } from 'pixi-svelte';
	import type * as PIXI from 'pixi.js';
	import { MainContainer } from 'components-layout';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { stateBetDerived } from 'state-shared';

	import {
		BITMAP_FONT_SCALE,
		BOARD_MASK_SPIN_OVERFLOW,
		SYMBOL_SIZE,
		WIN_HUD_COUNT_UP_MS,
		WIN_HUD_FONT_SIZE,
		isPopoutSmallViewport,
		isPopoutViewport,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import { computeDuelScreenLayout, getDuelPixiBoardLayout } from '../game/duelLayout';
	import { scaleMsByGameSpeed } from '../game/gameSpeed';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import { getDuelBoardStack } from '../game/stateDuelBoards.svelte';
	import { stateGame, type ReelSymbol } from '../game/stateGame.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import BoardBase from './BoardBase.svelte';
	import PaylineOverlay from './PaylineOverlay.svelte';
	import PaylineWinAmounts from './PaylineWinAmounts.svelte';
	import ResponsiveCurrencyBitmapText from './ResponsiveCurrencyBitmapText.svelte';
	import SuperWildCurtainPixi from './SuperWildCurtainPixi.svelte';

	type Props = {
		side: DuelSide;
		layer: DuelPixiBoardLayer;
	};

	const props: Props = $props();
	const context = getContext();
	const stack = $derived(getDuelBoardStack(props.side));

	const layout = $derived.by(() => {
		const ml = context.stateLayoutDerived.mainLayout();
		const canvas = context.stateLayoutDerived.canvasSizes();
		const base = context.stateGameDerived.baseBoardLayout();
		const duel = computeDuelScreenLayout({
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
			layoutType: context.stateLayoutDerived.layoutType(),
			mainLayout: ml,
			boardLayout: base,
		});
		return getDuelPixiBoardLayout({
			duel,
			side: props.side,
			mainLayout: ml,
			base,
		});
	});

	const reelsActive = $derived(stack.board.some((reel) => reel.reelState.motion !== 'stopped'));
	// Stencil Graphics — dual-safe (Sprite BoardMask corrupts dog desk to ~3 columns).
	// Bottom stays tight via BOARD_MASK_SPIN_OVERFLOW so symbols don't bleed into
	// the transparent nameplate slot under the playfield.
	const maskTop = $derived(reelsActive ? BOARD_MASK_SPIN_OVERFLOW.top : 0);
	const maskBottom = $derived(reelsActive ? BOARD_MASK_SPIN_OVERFLOW.bottom : 0);
	const drawDuelMask = $derived((g: PIXI.Graphics) => {
		g.rect(
			-SYMBOL_SIZE,
			-maskTop,
			layout.width + SYMBOL_SIZE * 2,
			layout.height + maskTop + maskBottom,
		);
		g.fill(0xffffff);
	});

	const sideTotal = $derived(props.side === 'cat' ? stateDuel.catTotal : stateDuel.dogTotal);
	// Persist side bank under the desk (WIN $…) for the whole duel — do not clear between spins.
	const showWin = $derived(stateDuel.active);

	/**
	 * Under-desk bank count-up — ONLY on the `win` layer.
	 * Game.svelte mounts ~9 DuelPixiBoard instances per side; if every layer ran
	 * this effect, the first one would clear `winHudCountUpPendingBySide` and the
	 * actual WIN label would snap instead of tweening.
	 *
	 * IMPORTANT: never reassign `winHudCountUpPendingBySide` on every run when
	 * banks are 0 — that caused an infinite $effect loop and killed the tab.
	 */
	const bankTween = new Tween(0);
	let bankTweenTarget: number | null = null;
	$effect(() => {
		if (props.layer !== 'win') return;

		const target = sideTotal;
		const wantCountUp = stateDuel.winHudCountUpPendingBySide[props.side];
		const from = bankTween.current;

		const clearCountUpFlag = () => {
			if (!stateDuel.winHudCountUpPendingBySide[props.side]) return;
			stateDuel.winHudCountUpPendingBySide[props.side] = false;
		};

		if (target <= 0 || target + 0.01 < from) {
			clearCountUpFlag();
			bankTweenTarget = null;
			bankTween.set(target, { duration: 0 });
			return;
		}

		if (wantCountUp && target > from + 0.01) {
			clearCountUpFlag();
			bankTweenTarget = target;
			bankTween.set(target, {
				duration: scaleMsByGameSpeed(WIN_HUD_COUNT_UP_MS, stateGame.gameSpeed),
			});
			return;
		}

		if (bankTweenTarget != null && Math.abs(target - bankTweenTarget) < 0.01) {
			return;
		}

		bankTweenTarget = null;
		bankTween.set(target, { duration: 0 });
	});
	const displayBankAmount = $derived(Math.round(bankTween.current));

	/** Place WIN on the desk nameplate (same idea as base UiCashStacksLayout). */
	const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
	const isPopoutSmall = $derived(isPopoutSmallViewport(canvasSizes));
	const isPopout = $derived(isPopoutViewport(canvasSizes));
	const isPortrait = $derived(context.stateLayoutDerived.layoutType() === 'portrait');
	/** Gap under playfield center → nameplate WIN (larger = lower on plate). PC only nudge. */
	const winBelowBoardGap = $derived(isPortrait ? 34 : 34);
	const winHudPos = $derived({
		x: layout.x,
		y: layout.y + layout.height * 0.5 * layout.scale + winBelowBoardGap * layout.scale,
	});
	/**
	 * Popout S uses a much smaller mainLayout.scale — keep game-space font large
	 * so on-screen WIN stays readable on the nameplate (0.45 was microscopic).
	 */
	const winFontScale = $derived(isPopoutSmall ? 0.95 : 0.75);
	const WIN_TEXT_STYLE = $derived({
		fontSize: WIN_HUD_FONT_SIZE * BITMAP_FONT_SCALE * winFontScale,
		fontWeight: 'bold' as const,
		letterSpacing: 1,
	});
	const winLabelGap = $derived(WIN_HUD_FONT_SIZE * BITMAP_FONT_SCALE * 0.78 * winFontScale);

	onMount(() => {
		if (props.layer !== 'board') return;
		stack.enhancedBoard.readyToSpinEffect();
	});

	/** Spine win clips are ~1–2s; if `oncomplete` never fires the book pipeline hangs silently. */
	const DUEL_WIN_ANIM_TIMEOUT_MS = 3500;

	const waitForWinComplete = (reelSymbol: ReelSymbol) =>
		Promise.race([
			waitForResolve((resolve) => {
				reelSymbol.oncomplete = resolve;
			}),
			waitForTimeout(Math.ceil(DUEL_WIN_ANIM_TIMEOUT_MS / stateBetDerived.timeScale())),
		]);

	context.eventEmitter.subscribeOnMount({
		duelBoardAnimateSymbols: async ({ side, symbolPositions }) => {
			if (props.layer !== 'board' || side !== props.side) return;
			await Promise.all(
				symbolPositions.map(async (position) => {
					const reelSymbol = stack.board[position.reel]?.reelState.symbols[position.row];
					if (!reelSymbol) return;
					if (
						reelSymbol.symbolState === 'win' ||
						reelSymbol.symbolState === 'postWinStatic' ||
						reelSymbol.symbolState === 'winLift'
					) {
						reelSymbol.symbolState = 'static';
						await tick();
					}
					reelSymbol.symbolState = 'winLift';
					await tick();
					reelSymbol.symbolState = 'win';
					await waitForWinComplete(reelSymbol);
					reelSymbol.symbolState = 'postWinStatic';
				}),
			);
		},
	});
</script>

{#if props.layer === 'base'}
	<MainContainer>
		<BoardFrame layer="base" {layout} disableCatZoom side={props.side} />
	</MainContainer>
{:else if props.layer === 'board'}
	<MainContainer>
		<BoardContainer {layout} disableCatZoom>
			<Container>
				<Graphics isMask draw={drawDuelMask} />
				<BoardBase board={stack.board} duelSide={props.side} />
			</Container>
		</BoardContainer>
	</MainContainer>
{:else if props.layer === 'overlay'}
	<MainContainer>
		<BoardFrame layer="overlay" {layout} disableCatZoom side={props.side} />
	</MainContainer>
{:else if props.layer === 'nameplate'}
	<!-- Under-desk WIN plate above the overlay bottom rail. -->
	<MainContainer>
		<BoardFrame layer="nameplate" {layout} disableCatZoom side={props.side} />
	</MainContainer>
{:else if props.layer === 'idleBounce'}
	<!-- Win / idle pops + resting B/W/SW above gold rails (same split as base game).
	     Without this, `symbolState === 'win'` unmounts from the masked board
	     and nothing remounts — symbols vanish and duelBoardAnimateSymbols hangs. -->
	<MainContainer>
		<BoardContainer {layout} disableCatZoom>
			<BoardBase board={stack.board} duelSide={props.side} idleBounce />
			<BoardBase board={stack.board} duelSide={props.side} fullColumn />
		</BoardContainer>
	</MainContainer>
{:else if props.layer === 'superWild'}
	<MainContainer>
		<BoardContainer {layout} disableCatZoom>
			<SuperWildCurtainPixi duelSide={props.side} />
		</BoardContainer>
	</MainContainer>
{:else if props.layer === 'paylines'}
	<!-- Same as base PaylineLayer: above gold rails, not under the contour. -->
	<MainContainer>
		<BoardContainer {layout} disableCatZoom>
			<PaylineOverlay side={props.side} />
			<PaylineWinAmounts side={props.side} />
		</BoardContainer>
	</MainContainer>
{:else if props.layer === 'win' && showWin}
	<MainContainer>
		<Container x={winHudPos.x} y={winHudPos.y} zIndex={20}>
			<ResponsiveCurrencyBitmapText
				anchor={0.5}
				bodyFontVariant="prostoi"
				eventMode="none"
				prefix={context.i18nDerived.win().toUpperCase()}
				amount={displayBankAmount}
				bookEvent
				maxWidth={layout.width * layout.scale * 0.96}
				minScale={0.5}
				labelGap={winLabelGap}
				style={WIN_TEXT_STYLE}
			/>
		</Container>
	</MainContainer>
{/if}
