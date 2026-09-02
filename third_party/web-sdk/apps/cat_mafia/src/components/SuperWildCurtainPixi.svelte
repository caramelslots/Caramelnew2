<!--
	Super Wild column curtains in Pixi — one per opened reel.
	Sits above reels / rails, under paylines.
-->
<script lang="ts">
	import { getContext } from '../game/context';
	import { BOARD_SIZES, SYMBOL_SIZE } from '../game/constants';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { stateDuel, type DuelSide } from '../game/stateDuel.svelte';
	import {
		SUPER_WILD_COLUMN_COVER_X,
		SUPER_WILD_COLUMN_COVER_Y,
		SUPER_WILD_OFFSET_Y_PX,
	} from '../game/superWildHtmlSpine';
	import SuperWildCurtainColumn from './SuperWildCurtainColumn.svelte';

	type Props = {
		/** When set, only render the matching duel-desk curtains. */
		duelSide?: DuelSide;
	};

	const props: Props = $props();
	const context = getContext();
	const show = $derived(gameEntrance.showContent);
	const isDesktop = $derived(context.stateLayoutDerived.layoutType() === 'desktop');

	const curtains = $derived.by(() => {
		if (props.duelSide) {
			return stateDuel.superWildCurtains.filter((c) => c.side === props.duelSide);
		}
		return context.stateGame.superWildCurtains;
	});

	const boxW = $derived(SYMBOL_SIZE * SUPER_WILD_COLUMN_COVER_X);
	const boxH = $derived(BOARD_SIZES.height * SUPER_WILD_COLUMN_COVER_Y);
	const colY = $derived(SUPER_WILD_OFFSET_Y_PX + boxH * 0.5);
</script>

{#if show && isDesktop}
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
{/if}
