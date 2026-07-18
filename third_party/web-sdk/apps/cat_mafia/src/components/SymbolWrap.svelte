<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container } from 'pixi-svelte';

	import { SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';

	type Props = {
		debug?: boolean;
		x: number;
		y: number;
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
		/**
		 * Keep rendering while the reel is scrolling — SymbolWrap culling is
		 * based on the visible board window only; fast spins can temporarily
		 * move pool symbols outside that window even though they are on-screen
		 * through the BoardMask.
		 */
		spinActive?: boolean;
		children: Snippet;
	};

	const props: Props = $props();

	// Culling window: keep a symbol rendered while any part of it may be
	// visible through the BoardMask (y=0 … boardHeight).
	// TOP / BOTTOM (spin) — one full symbol past the mask for smooth feather clip.
	// TOP (idle) — grid top edge; parked padding at y−50 must not render.
	// IMPORTANT: do NOT short-circuit with `spinActive || …` — that rendered the
	// entire padding pool (~20–30 cells/reel) every spin frame on mobile.
	const top = $derived(props.spinActive ? -SYMBOL_SIZE : 0);
	const bottom = $derived(
		props.spinActive ? SYMBOL_SIZE * (BOARD_DIMENSIONS.y + 1) : SYMBOL_SIZE * BOARD_DIMENSIONS.y,
	);
	const inFrame = $derived(props.y >= top && props.y <= bottom);
</script>

{#if props.debug || inFrame}
	<Container
		x={props.x}
		y={props.y}
		scale={{ x: props.scaleX ?? 1, y: props.scaleY ?? 1 }}
		alpha={props.alpha ?? 1}
	>
		{@render props.children()}
	</Container>
{/if}
