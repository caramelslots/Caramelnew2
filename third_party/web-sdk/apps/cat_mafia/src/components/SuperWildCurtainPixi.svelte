<!--
	Super Wild column curtains in Pixi — one per opened reel.
	Sits above reels / rails, under paylines.

	Graphics mask matches the main reel BoardMask hole so target-pick slide
	clips the curtain under the desk (same park travel as Bonus/symbols).
	Do not use Sprite BoardMask here — extra sprite masks corrupt the reels.
-->
<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Container, Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		BOARD_MASK_OVERFLOW,
		BOARD_SIZES,
		DESK_BOTTOM_MASK_SLACK_PX,
		DESK_BOTTOM_PULL_PX,
		SYMBOL_SIZE,
	} from '../game/constants';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import {
		SUPER_WILD_COLUMN_COVER_X,
		SUPER_WILD_COLUMN_COVER_Y,
		SUPER_WILD_OFFSET_Y_PX,
	} from '../game/superWildHtmlSpine';
	import { ensureSwCurtainsForBoard } from '../game/swCurtainGuard';
	import SuperWildCurtainColumn from './SuperWildCurtainColumn.svelte';

	type Props = {
		/** When set, only render the matching duel-desk curtains. */
		duelSide?: DuelSide;
	};

	const props: Props = $props();
	const context = getContext();
	const show = $derived(gameEntrance.showContent);

	const curtains = $derived.by(() => {
		if (props.duelSide) {
			return stateDuel.superWildCurtains.filter((c) => c.side === props.duelSide);
		}
		return context.stateGame.superWildCurtains;
	});

	// Hard rule: if the board somehow has a full SW column without a curtain,
	// create one immediately (never leave a Wild.webp stack visible).
	$effect(() => {
		if (props.duelSide) return;
		void context.stateGame.board;
		void context.stateGame.stickySwByReel;
		void context.stateGame.superWildCurtains;
		ensureSwCurtainsForBoard();
	});

	const boxW = $derived(SYMBOL_SIZE * SUPER_WILD_COLUMN_COVER_X);
	const boxH = $derived(BOARD_SIZES.height * SUPER_WILD_COLUMN_COVER_Y);
	const colY = $derived(SUPER_WILD_OFFSET_Y_PX + boxH * 0.5);
	/** Same park-under-mask travel as Board symbols when the target slides in. */
	const slideY = $derived(context.stateGameDerived.targetPickBoardY());

	/** Stopped-reel BoardMask geometry (board-local px). */
	const maskTop = BOARD_MASK_OVERFLOW.top;
	const maskBottom = Math.max(
		0,
		BOARD_MASK_OVERFLOW.bottom - DESK_BOTTOM_PULL_PX + DESK_BOTTOM_MASK_SLACK_PX,
	);
	const drawBoardClip = $derived((g: PIXI.Graphics) => {
		g.rect(
			-SYMBOL_SIZE,
			-maskTop,
			BOARD_SIZES.width + SYMBOL_SIZE * 2,
			BOARD_SIZES.height + maskTop + maskBottom,
		);
		g.fill(0xffffff);
	});
</script>

{#if show}
	<Container>
		<Graphics isMask draw={drawBoardClip} />
		<Container y={slideY}>
			{#each curtains as curtain (curtain.reel)}
				<SuperWildCurtainColumn
					reel={curtain.reel}
					mult={curtain.mult}
					phase={curtain.phase}
					originRow={curtain.originRow}
					playKey={`${props.duelSide ?? 'base'}:${curtain.reel}:${curtain.mult}`}
					{boxW}
					{boxH}
					{colY}
				/>
			{/each}
		</Container>
	</Container>
{/if}
