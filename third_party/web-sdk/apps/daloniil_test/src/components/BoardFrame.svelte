<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { Sprite, SpineProvider, SpineTrack, Container } from 'pixi-svelte';
	import { Tween } from 'svelte/motion';
	import { SECOND } from 'constants-shared/time';

	import {
		BOARD_FRAME_OFFSET,
		DESK_PARCHMENT,
		DESK_PARCHMENT_PADDING,
		REELHOUSE_GLOW_SCALE,
	} from '../game/constants';
	import { getContext } from '../game/context';

	const context = getContext();

	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const frameX = $derived(boardLayout.pivot.x + BOARD_FRAME_OFFSET.x);
	const frameY = $derived(boardLayout.pivot.y + BOARD_FRAME_OFFSET.y);

	const DESK_SIZE = $derived({
		width: (boardLayout.width * DESK_PARCHMENT_PADDING.width) / DESK_PARCHMENT.widthFrac,
		height: (boardLayout.height * DESK_PARCHMENT_PADDING.height) / DESK_PARCHMENT.heightFrac,
	});

	const deskProps = $derived({
		x: frameX - DESK_PARCHMENT.offsetXFrac * DESK_SIZE.width,
		y: frameY - DESK_PARCHMENT.offsetYFrac * DESK_SIZE.height,
		anchor: 0.5,
		width: DESK_SIZE.width,
		height: DESK_SIZE.height,
	});

	const GLOW_SIZE = $derived({
		width: boardLayout.width * REELHOUSE_GLOW_SCALE.width,
		height: boardLayout.height * REELHOUSE_GLOW_SCALE.height,
	});

	const showBaseBoard = $derived(context.stateGame.gameType === 'basegame');
	const showFeatureBoard = $derived(context.stateGame.gameType === 'freegame');

	const alphaDay = new Tween(untrack(() => showBaseBoard) ? 1 : 0, { duration: SECOND });
	const alphaNight = new Tween(untrack(() => showFeatureBoard) ? 1 : 0, { duration: SECOND });

	$effect(() => {
		alphaDay.set(showBaseBoard ? 1 : 0);
	});
	$effect(() => {
		alphaNight.set(showFeatureBoard ? 1 : 0);
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

<Container x={boardLayout.x} y={boardLayout.y} scale={boardLayout.scale}>
	<Container x={-boardLayout.pivot.x} y={-boardLayout.pivot.y} sortableChildren={true}>
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

		{#if alphaDay.current > 0}
			<Container alpha={alphaDay.current} zIndex={0}>
				<Sprite key="boardDay" {...deskProps} />
			</Container>
		{/if}

		{#if alphaNight.current > 0}
			<Container alpha={alphaNight.current} zIndex={0}>
				<Sprite key="boardNight" {...deskProps} />
			</Container>
		{/if}
	</Container>
</Container>
