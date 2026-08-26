<script lang="ts" module>
	export type EmitterEventBoardFrame = {
		/** Crest glow pulse — lines, FS bullet collect, or paw resolve. */
		type: 'boardFramePulse';
		/** Duel: pulse only this desk. Omit for base (single board). */
		side?: 'cat' | 'dog';
		/** Crest replays; win lines use 3 (same as DEV Pulse ×3). Default 1. */
		times?: number;
	};
</script>

<script lang="ts">
	/**
	 * Fixed desk slot: size + position come only from DESK_PARCHMENT (legacy
	 * desk box). Board art is fitted into that slot — swap BOARD_DESK_CONTENT
	 * / the spine when the asset changes; the slot stays put.
	 */
	import { onDestroy } from 'svelte';
	import { Container, SpineProvider } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import {
		BOARD_DESK_CONTENT,
		BOARD_FRAME_OFFSET,
		DESK_PARCHMENT,
		DESK_PARCHMENT_PADDING,
		DESK_VISUAL_OFFSET_Y,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import { catBoardZoom } from '../game/catAnticipationBoardZoom.svelte';
	import BoardFrameSlotFilter from './BoardFrameSlotFilter.svelte';
	import BoardFrameRailsMask from './BoardFrameRailsMask.svelte';
	import BoardFramePulseTrack from './BoardFramePulseTrack.svelte';

	type BoardLayout = {
		x: number;
		y: number;
		scale: number;
		pivot: { x: number; y: number };
		width: number;
		height: number;
	};

	type Props = {
		/**
		 * `base` — desk fill under the reels.
		 * `overlay` — frame + vertical gold grids above resting symbols
		 * (column holes masked). Idle/win pops render above this layer.
		 */
		layer?: 'base' | 'overlay';
		layout?: BoardLayout;
		disableCatZoom?: boolean;
		/** Duel desk — filters `boardFramePulse` to this side only. */
		side?: 'cat' | 'dog';
	};

	/** Desk body under the reel window (dark playfield + frame fill). */
	const BASE_HIDDEN_SLOTS = [
		'glow2',
		'glow3',
		'gold_lines2',
		'gold_lines',
		'back',
		'dark_outlines',
		'paw',
	] as const;
	/**
	 * Rails / crest above resting symbols. Keep `board` visible and mask out
	 * the five reel columns so only the frame + vertical gold grids remain.
	 */
	const OVERLAY_HIDDEN_SLOTS = ['below'] as const;
	const GLOW_ZERO_ALPHA_SLOTS = ['glow2', 'glow3'] as const;

	const BOARD_PULSE_ANIMATION = 'animation';

	const props: Props = $props();
	const layer = $derived(props.layer ?? 'base');

	const context = getContext();

	const boardLayout = $derived(props.layout ?? context.stateGameDerived.boardLayout());
	const boardScale = $derived(
		boardLayout.scale * (props.disableCatZoom ? 1 : catBoardZoom.current),
	);
	const frameX = $derived(boardLayout.pivot.x + BOARD_FRAME_OFFSET.x);
	const frameY = $derived(boardLayout.pivot.y + BOARD_FRAME_OFFSET.y);

	/** Immutable on-screen desk box (same math as the old Sprite desk). */
	const slotSize = $derived({
		width: (boardLayout.width * DESK_PARCHMENT_PADDING.width) / DESK_PARCHMENT.widthFrac,
		height: (boardLayout.height * DESK_PARCHMENT_PADDING.height) / DESK_PARCHMENT.heightFrac,
	});

	const slotCenterX = $derived(frameX - DESK_PARCHMENT.offsetXFrac * slotSize.width);
	const slotCenterY = $derived(
		frameY - DESK_PARCHMENT.offsetYFrac * slotSize.height + DESK_VISUAL_OFFSET_Y,
	);

	/** Stretch current desk art to fill the slot (object-fit: fill). */
	const contentScale = $derived({
		x: slotSize.width / BOARD_DESK_CONTENT.width,
		y: slotSize.height / BOARD_DESK_CONTENT.height,
	});

	/**
	 * Spine root inside the slot so content center sits at slot (0,0).
	 * `Skeleton.yDown` → skeleton (cx, cy) draws at local (cx, −cy).
	 */
	const contentRootX = $derived(-BOARD_DESK_CONTENT.centerX * contentScale.x);
	const contentRootY = $derived(BOARD_DESK_CONTENT.centerY * contentScale.y);

	/** Bump to force-replay the one-shot glow clip (even if already complete). */
	let pulseToken = $state(0);
	/** Pending ×N pulse timeouts — cleared on unmount / new burst. */
	let pulseTimers: ReturnType<typeof setTimeout>[] = [];

	const clearPulseTimers = () => {
		for (const timer of pulseTimers) clearTimeout(timer);
		pulseTimers = [];
	};

	onDestroy(clearPulseTimers);

	context.eventEmitter.subscribeOnMount({
		boardFramePulse: (event) => {
			if ((props.layer ?? 'base') !== 'overlay') return;
			if (event.side && props.side && event.side !== props.side) return;
			const times = Math.max(1, Math.floor(event.times ?? 1));
			const gapMs = 400 / stateBetDerived.timeScale();
			clearPulseTimers();
			for (let i = 0; i < times; i++) {
				if (i === 0) {
					pulseToken += 1;
					continue;
				}
				pulseTimers.push(
					setTimeout(() => {
						pulseToken += 1;
					}, gapMs * i),
				);
			}
		},
	});
</script>

<Container x={boardLayout.x} y={boardLayout.y} scale={boardScale}>
	<Container x={-boardLayout.pivot.x} y={-boardLayout.pivot.y}>
		<!-- Fixed desk slot: size/position independent of the art inside. -->
		<Container x={slotCenterX} y={slotCenterY}>
			{#if layer === 'overlay'}
				<BoardFrameRailsMask
					slotWidth={slotSize.width}
					slotHeight={slotSize.height}
					boardWidth={boardLayout.width}
					boardHeight={boardLayout.height}
				/>
			{/if}
			<SpineProvider key="boardFrame" x={contentRootX} y={contentRootY} scale={contentScale}>
				<BoardFrameSlotFilter
					hiddenSlots={layer === 'base' ? BASE_HIDDEN_SLOTS : OVERLAY_HIDDEN_SLOTS}
					zeroAlphaSlots={layer === 'overlay' ? GLOW_ZERO_ALPHA_SLOTS : undefined}
				/>
				{#if layer === 'overlay'}
					<BoardFramePulseTrack
						playToken={pulseToken}
						animationName={BOARD_PULSE_ANIMATION}
						timeScale={stateBetDerived.timeScale()}
					/>
				{/if}
			</SpineProvider>
		</Container>
	</Container>
</Container>
