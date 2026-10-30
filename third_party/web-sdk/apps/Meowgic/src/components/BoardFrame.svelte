<script lang="ts" module>
	export type EmitterEventBoardFrame = {
		/**
		 * Reserved for crest / win pulse. Spin scene reaction is driven by
		 * `EnableSpinSceneReaction` + `spinSceneReaction`.
		 */
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
	import { Container, SpineProvider, SpineTrack, Sprite } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import {
		BOARD_DESK_CONTENT,
		BOARD_FRAME_OFFSET,
		DESK_BOTTOM_PULL_PX,
		DESK_PARCHMENT,
		DESK_PARCHMENT_PADDING,
		DESK_VISUAL_OFFSET_Y,
	} from '../game/constants';
	import { getContext } from '../game/context';
	import { catBoardZoom } from '../game/catAnticipationBoardZoom.svelte';
	import { DEMO_BOARD_FIT } from '../game/demoStageArt';
	import { devPreview } from '../game/devPreview.svelte';
	import { spinSceneReaction } from '../game/spinSceneReaction.svelte';
	import BoardFrameSlotFilter from './BoardFrameSlotFilter.svelte';
	import BoardFrameRailsMask from './BoardFrameRailsMask.svelte';
	import BoardReactionPoseSampler from './BoardReactionPoseSampler.svelte';
	import SpineTrackStackController from './SpineTrackStackController.svelte';

	/** DEV: force a single board clip instead of the stacked production idles. */
	const forcedBoardAnim = $derived(devPreview.boardAnim);

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
		 * `base` — desk fill under the reels (no nameplate).
		 * `overlay` — frame + vertical gold grids above resting symbols
		 * (column holes masked). Idle/win pops render above this layer.
		 * `rails` — column grids only (under the target-pick cabinet).
		 * `nameplate` — top crest crystal + bottom wax stamp, drawn above
		 * symbols and the Super Wild curtain.
		 */
		layer?: 'base' | 'overlay' | 'rails' | 'nameplate';
		/** Overlay mask: hide rails while the target cabinet covers them. */
		maskVariant?: 'all' | 'frame' | 'rails';
		layout?: BoardLayout;
		disableCatZoom?: boolean;
	};

	/**
	 * Under the reels: dark playfield + the few props that hang into the
	 * column holes (fabrics, key). Everything else lives on the overlay so
	 * additive smoke / multiply shadows are not drawn twice.
	 */
	const BASE_VISIBLE_SLOTS = ['board', 'right_fabric', 'left_fabric', 'key2'] as const;

	/**
	 * Top crest crystal + bottom wax stamp — live on the `nameplate` layer only
	 * so they cover symbols and the Super Wild curtain.
	 */
	const ABOVE_SYMBOLS_SLOTS = [
		'bg',
		'white',
		'outline',
		'purple_diamond',
		'base',
		'little',
		'little2',
		'stamp',
		'paw',
		'paw2',
	] as const;

	/** Main desk breathe + layered prop idles from the designer export. */
	const BOARD_IDLE_TRACKS = [
		{ trackIndex: 0, animationName: 'idle/idle_board' },
		{ trackIndex: 1, animationName: 'idle/bookmarks' },
		{ trackIndex: 2, animationName: 'idle/clothes' },
		{ trackIndex: 3, animationName: 'idle/key' },
		{ trackIndex: 4, animationName: 'idle/pages' },
	] as const;
	/** Spin reaction — loops while reels move, mixes back to idle when they stop. */
	const BOARD_REACTION_TRACKS = [
		{ trackIndex: 0, animationName: 'reaction/reaction' },
	] as const;

	const props: Props = $props();
	const layer = $derived(props.layer ?? 'base');
	const maskVariant = $derived(
		props.maskVariant ?? (layer === 'rails' ? 'rails' : 'all'),
	);
	const showDemoArt = $derived(devPreview.forceShowDemoStageArt);
	/** Board plays one reaction per Spin token — no loop for the rest of the spin. */
	const boardReactionToken = $derived(
		forcedBoardAnim ? 0 : spinSceneReaction.token,
	);

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

	/**
	 * Stretch desk art to fill the slot (object-fit: fill), then top-anchor a Y
	 * compress so DESK_BOTTOM_PULL_PX lifts only the bottom rail.
	 * Demo still uses the same BOARD_DESK_CONTENT box as the Spine `board` slot.
	 */
	const contentScale = $derived({
		x: slotSize.width / BOARD_DESK_CONTENT.width,
		y: (slotSize.height - DESK_BOTTOM_PULL_PX) / BOARD_DESK_CONTENT.height,
	});

	/**
	 * Spine root inside the slot so content center sits at slot (0,0).
	 * `Skeleton.yDown` → skeleton (cx, cy) draws at local (cx, −cy).
	 * −DESK_BOTTOM_PULL_PX/2 after the shorter Y scale keeps the top rail fixed.
	 */
	const contentRootX = $derived(-BOARD_DESK_CONTENT.centerX * contentScale.x);
	const contentRootY = $derived(
		BOARD_DESK_CONTENT.centerY * contentScale.y - DESK_BOTTOM_PULL_PX / 2,
	);

	/** Exact on-screen rect of the Spine `board` attachment (same as SpineProvider). */
	const spineBoardRect = $derived({
		x: contentRootX + BOARD_DESK_CONTENT.centerX * contentScale.x,
		y: contentRootY - BOARD_DESK_CONTENT.centerY * contentScale.y,
		width: BOARD_DESK_CONTENT.width * contentScale.x,
		height: BOARD_DESK_CONTENT.height * contentScale.y,
	});

	/**
	 * Demo still — same slot as Spine, but scaled/offset so its painted playfield
	 * lands on the Spine playfield (book chrome sits above the reels).
	 */
	const demoBoardRect = $derived({
		x: spineBoardRect.x + DEMO_BOARD_FIT.offsetX * spineBoardRect.width,
		y: spineBoardRect.y + DEMO_BOARD_FIT.offsetY * spineBoardRect.height,
		width: spineBoardRect.width * DEMO_BOARD_FIT.scaleX,
		height: spineBoardRect.height * DEMO_BOARD_FIT.scaleY,
	});
</script>

<Container x={boardLayout.x} y={boardLayout.y} scale={boardScale}>
	<Container x={-boardLayout.pivot.x} y={-boardLayout.pivot.y}>
		<!-- Fixed desk slot: size/position independent of the art inside. -->
		<Container x={slotCenterX} y={slotCenterY}>
			{#if layer === 'overlay' || layer === 'rails'}
				<BoardFrameRailsMask
					slotWidth={slotSize.width}
					slotHeight={slotSize.height}
					boardWidth={boardLayout.width}
					boardHeight={boardLayout.height}
					variant={maskVariant}
				/>
			{/if}
			{#if showDemoArt}
				{#if layer === 'base' || layer === 'overlay' || layer === 'rails'}
					<Sprite
						key="demoBoard"
						x={demoBoardRect.x}
						y={demoBoardRect.y}
						width={demoBoardRect.width}
						height={demoBoardRect.height}
						anchor={0.5}
					/>
				{/if}
			{:else}
				<SpineProvider key="boardFrame" x={contentRootX} y={contentRootY} scale={contentScale}>
					{#if layer === 'base'}
						<BoardReactionPoseSampler />
						<BoardFrameSlotFilter visibleSlots={BASE_VISIBLE_SLOTS} />
					{:else if layer === 'nameplate'}
						<BoardFrameSlotFilter visibleSlots={ABOVE_SYMBOLS_SLOTS} />
					{:else}
						<BoardFrameSlotFilter hiddenSlots={ABOVE_SYMBOLS_SLOTS} />
					{/if}
					{#if forcedBoardAnim}
						{#key `${forcedBoardAnim.clipId}:${forcedBoardAnim.nonce}`}
							<SpineTrack
								trackIndex={0}
								animationName={forcedBoardAnim.animationName}
								loop={forcedBoardAnim.loop}
							/>
						{/key}
					{:else}
						<SpineTrackStackController
							idleTracks={BOARD_IDLE_TRACKS}
							reactionTracks={BOARD_REACTION_TRACKS}
							oneShot
							reactionToken={boardReactionToken}
							timeScale={stateBetDerived.timeScale()}
						/>
					{/if}
				</SpineProvider>
			{/if}
		</Container>
	</Container>
</Container>
