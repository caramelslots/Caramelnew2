<!--
	Super Wild column curtains in Pixi — one per opened reel.
	Sits above reels / rails, under paylines.

	Graphics mask matches the main reel BoardMask hole so target-pick slide
	clips the curtain under the desk (same park travel as Bonus/symbols).
	Do not use Sprite BoardMask here — extra sprite masks corrupt the reels.
-->
<script lang="ts">
	import { Container, Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import {
		drawSuperWildBoardClipMask,
		getSuperWildColumnBoxMetrics,
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

	const columnBox = $derived(getSuperWildColumnBoxMetrics());
	const boxW = $derived(columnBox.boxW);
	const boxH = $derived(columnBox.boxH);
	const colY = $derived(columnBox.colY);
	/** Same park-under-mask travel as Board symbols when the target slides in. */
	const slideY = $derived(context.stateGameDerived.targetPickBoardY());
</script>

{#if show}
	<Container>
		<Graphics isMask draw={drawSuperWildBoardClipMask} />
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
