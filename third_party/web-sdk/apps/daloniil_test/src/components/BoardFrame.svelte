<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	import { Sprite, SpineProvider, SpineTrack } from 'pixi-svelte';

	import { BOARD_FRAME_OFFSET, REELHOUSE_GLOW_SCALE } from '../game/constants';
	import { getContext } from '../game/context';

	const context = getContext();
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const frameX = $derived(boardLayout.x + BOARD_FRAME_OFFSET.x);
	const frameY = $derived(boardLayout.y + BOARD_FRAME_OFFSET.y);
	// Frame sprites — slightly larger than the 5×5 grid so the bezel wraps the symbols.
	const FRAME_PADDING = { width: 1.2, height: 1.18 };
	const FRAME_SIZE = $derived({
		width: boardLayout.width * FRAME_PADDING.width,
		height: boardLayout.height * FRAME_PADDING.height,
	});
	// Purple pulse — tied to board size only (~62%), not FRAME_PADDING (was ~120% after board resize).
	const GLOW_SIZE = $derived({
		width: boardLayout.width * REELHOUSE_GLOW_SCALE.width,
		height: boardLayout.height * REELHOUSE_GLOW_SCALE.height,
	});

	type AnimationName = 'reelhouse_glow_start' | 'reelhouse_glow_idle' | 'reelhouse_glow_exit';

	let animationName = $state<AnimationName | undefined>(undefined);
	let loop = $state(false);

	context.eventEmitter.subscribeOnMount({
		boardFrameGlowShow: () => {
			animationName = 'reelhouse_glow_start';
			loop = false;
		},
		boardFrameGlowHide: () => {
			if (animationName) animationName = 'reelhouse_glow_exit';
		},
	});
</script>

{#if animationName}
	<SpineProvider
		zIndex={-1}
		key="reelhouse"
		x={frameX}
		y={frameY}
		width={GLOW_SIZE.width}
		height={GLOW_SIZE.height}
	>
		<SpineTrack
			trackIndex={0}
			{animationName}
			{loop}
			listener={{
				complete: (entry) => {
					if (entry.animation) {
						if (entry.animation.name === 'reelhouse_glow_start') {
							animationName = 'reelhouse_glow_idle';
							loop = true;
						}

						if (entry.animation.name === 'reelhouse_glow_exit') {
							animationName = undefined;
							loop = false;
						}
					}
				},
			}}
		/>
	</SpineProvider>
{/if}

<Sprite
	key="frame_bg.png"
	anchor={0.5}
	x={frameX}
	y={frameY}
	width={FRAME_SIZE.width}
	height={FRAME_SIZE.height}
/>

<Sprite
	key="frame_edge.png"
	anchor={0.5}
	x={frameX}
	y={frameY}
	width={FRAME_SIZE.width}
	height={FRAME_SIZE.height}
/>
