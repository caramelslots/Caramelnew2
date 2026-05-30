<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';
	import { getContextBoard } from 'components-shared';

	import { SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';

	type Props = {
		debug?: boolean;
		x: number;
		y: number;
		animating: boolean;
		/**
		 * Per-axis scale on the wrapping Container. Defaults to 1.
		 * The inner sprite/spine is centred at the container origin (anchor
		 * 0.5 at 0,0), so scaling compresses/stretches the symbol around its
		 * own centre without shifting its on-screen position.
		 *
		 * Used together by the reel-level landing squash (`landScaleY`) and
		 * the derived jelly stretch (`landScaleX`) — see createReelForSpinning.
		 */
	scaleX?: number;
	scaleY?: number;
	/**
	 * Прозрачность всей символьной обёртки. Используется для затемнения
	 * невыигрышных символов во время win-анимации — см. DIM_NON_WINNING и
	 * stateGame.winSpotlightActive. Применяется на уровне родительского
	 * Container'а, поэтому автоматически касается sprite/spine/multiplier-
	 * текста — отдельно править вложенные компоненты не нужно.
	 */
	alpha?: number;
	children: Snippet;
};

const props: Props = $props();
const boardContext = getContextBoard();
const show = $derived(
	(boardContext.animate && props.animating) || (!boardContext.animate && !props.animating),
);
const top = 0;
const bottom = SYMBOL_SIZE * BOARD_DIMENSIONS.y;
const inFrame = $derived(props.y >= top && props.y <= bottom);
</script>

{#if props.debug || show}
	<Container
		x={props.x}
		y={props.y}
		scale={{ x: props.scaleX ?? 1, y: props.scaleY ?? 1 }}
		alpha={props.alpha ?? 1}
		visible={props.debug || inFrame}
	>
		{@render props.children()}
	</Container>
{/if}
