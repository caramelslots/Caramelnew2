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
	import { releaseCanvasTextGpu } from '../game/pixiTextureMemory';
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
	/** Same gate as the board — not `showContent`, or the curtain pops in after HUD. */
	const show = $derived(gameEntrance.preloadContent);

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

	let hadCurtains = false;
	$effect(() => {
		if (props.duelSide) return;
		if (curtains.length > 0) {
			hadCurtains = true;
			return;
		}
		if (!hadCurtains) return;
		hadCurtains = false;
		const pixi = context.stateApp.pixiApplication ?? null;
		let cancelled = false;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				if (!cancelled) releaseCanvasTextGpu(pixi);
			});
		});
		return () => {
			cancelled = true;
		};
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
					duelSide={props.duelSide}
					{boxW}
					{boxH}
					{colY}
				/>
			{/each}
		</Container>
	</Container>
{/if}
