<!--
	One Duel desk layer. Game.svelte mounts base → board → overlay →
	idleBounce → superWild → nameplate → paylines for both sides so
	cat's desk never paints over dog's reels.
	Under-desk WIN $ is WinHudHtmlOverlay (proxima-nova).
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
		| 'paylines';
</script>

<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Container, Graphics } from 'pixi-svelte';
	import type * as PIXI from 'pixi.js';
	import { MainContainer } from 'components-layout';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { stateBetDerived } from 'state-shared';

	import {
		BOARD_MASK_OVERFLOW,
		BOARD_MASK_SPIN_OVERFLOW,
		DESK_BOTTOM_MASK_SLACK_PX,
		DESK_BOTTOM_PULL_PX,
		SYMBOL_SIZE,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import { computeDuelScreenLayout, getDuelPixiBoardLayout } from '../game/duelLayout';
	import { type DuelSide } from '../game/stateDuel.svelte';
	import { getDuelBoardStack } from '../game/stateDuelBoards.svelte';
	import { type ReelSymbol } from '../game/stateGame.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import BoardBase from './BoardBase.svelte';
	import PaylineOverlay from './PaylineOverlay.svelte';
	import PaylineWinAmounts from './PaylineWinAmounts.svelte';
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
	/**
	 * Stencil Graphics — dual Sprite BoardMasks still clip the dog desk to ~3
	 * columns even with per-instance feather textures. Match base BoardMask hole
	 * math (spin/idle overflow + desk bottom pull/slack) so bounce/spin stay clipped.
	 */
	const maskTop = $derived(
		reelsActive ? BOARD_MASK_SPIN_OVERFLOW.top : BOARD_MASK_OVERFLOW.top,
	);
	const maskBottom = $derived(
		Math.max(
			0,
			(reelsActive ? BOARD_MASK_SPIN_OVERFLOW.bottom : BOARD_MASK_OVERFLOW.bottom) -
				DESK_BOTTOM_PULL_PX +
				DESK_BOTTOM_MASK_SLACK_PX,
		),
	);
	const drawDuelMask = $derived((g: PIXI.Graphics) => {
		g.rect(
			-SYMBOL_SIZE,
			-maskTop,
			layout.width + SYMBOL_SIZE * 2,
			layout.height + maskTop + maskBottom,
		);
		g.fill(0xffffff);
	});

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
			<!-- Graphics stencil (dual-safe). Hole matches base BoardMask geometry. -->
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
	<!-- Win / idle pops + all resting tiles above gold rails (same as base game).
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
			<BoardBase abovePayline board={stack.board} duelSide={props.side} />
			<PaylineWinAmounts side={props.side} />
		</BoardContainer>
	</MainContainer>
{/if}
