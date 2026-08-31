/**
 * Designer handoff: `designer_assets/target` — shooting-gallery board + flip targets.
 * Used by TargetBoardOverlay (bonus pick / DEV preview).
 */

import {
	BOARD_FRAME_OFFSET,
	BOARD_SIZES,
	DESK_BOTTOM_PULL_PX,
	DESK_PARCHMENT,
	DESK_PARCHMENT_PADDING,
	DESK_VISUAL_OFFSET_Y,
} from './constants';

const SPRITE_BASE = `${import.meta.env.BASE_URL}assets/sprites/targetBoard`;

export const targetBoardSpriteUrl = (file: string) => `${SPRITE_BASE}/${file.replace(/^\//, '')}`;

export const resolveTargetBoardSpineUrl = (file: string) =>
	new URL(`assets/spines/targetBoard/${file}`.replace(/^\//, ''), window.location.href).href;

export const TARGET_BOARD_SPRITES = {
	background: targetBoardSpriteUrl('background.webp'),
	front: targetBoardSpriteUrl('front.webp'),
	back: targetBoardSpriteUrl('back.webp'),
	holder: targetBoardSpriteUrl('holder.webp'),
} as const;

/** Native background plate (designer_assets/target/images/background.png). */
export const TARGET_BOARD_NATIVE = { width: 2050, height: 1675 } as const;

/**
 * Whole cabinet texture (cap + shelves + plinth) in background.webp 2050×1675.
 * Only black side margins are cropped. The remaining plate is stretched to
 * fill the 5×4 playfield — 100% width and 100% height, cap and base stay.
 */
export const TARGET_BOARD_CONTENT = {
	left: 262 / 2050,
	top: 169 / 1675,
	width: 1544 / 2050,
	height: 1407 / 1675,
} as const;

/** Seat position as % of the cropped 5×4 board (PNG-space slot → wood box). */
export const targetBoardSlotStyle = (slot: { x: number; y: number }) => {
	const x = (slot.x - TARGET_BOARD_CONTENT.left) / TARGET_BOARD_CONTENT.width;
	const y = (slot.y - TARGET_BOARD_CONTENT.top) / TARGET_BOARD_CONTENT.height;
	return `left:${x * 100}%;top:${y * 100}%`;
};

/** Spine skeleton bounds (export/board_shooting targets_6.json). */
export const TARGET_BOARD_SPINE_VIEWPORT = {
	x: -1025,
	y: -968,
	width: 2050,
	height: 1993,
	padLeft: '0%',
	padRight: '0%',
	padTop: '0%',
	padBottom: '0%',
} as const;

export const TARGET_BOARD_SPINE_ANIMS = [
	'v1',
	'v1_faster',
	'v2',
	'v2_faster',
	'v3',
	'v3_faster',
	'v4',
] as const;

export type TargetBoardSpineAnim = (typeof TARGET_BOARD_SPINE_ANIMS)[number];

/** Production pick flip clips — chosen from hit offset (see pickTargetFlipAnim). */
export const TARGET_BOARD_PICK_FLIP_ANIMS = [
	'v3',
	'v4',
] as const satisfies readonly TargetBoardSpineAnim[];
export type TargetBoardPickFlipAnim = (typeof TARGET_BOARD_PICK_FLIP_ANIMS)[number];

/** @deprecated prefer pickTargetFlipAnim — kept as the default / fallback clip. */
export const TARGET_BOARD_PICK_FLIP_ANIM = 'v4' as const satisfies TargetBoardSpineAnim;

/** Production pick flip durations (Spine). */
export const TARGET_BOARD_PICK_FLIP_MS_BY_ANIM: Record<TargetBoardPickFlipAnim, number> = {
	v3: 1670,
	v4: 1470,
};

/** @deprecated prefer TARGET_BOARD_PICK_FLIP_MS_BY_ANIM[anim]. */
export const TARGET_BOARD_PICK_FLIP_MS = TARGET_BOARD_PICK_FLIP_MS_BY_ANIM.v4;

/**
 * Map a hit offset (relative to seat center, screen Y-down) to a flip clip.
 * Upper half of the disc → v3, lower → v4 — so spread drives the variant.
 */
export const pickTargetFlipAnim = (hitOffset: { x: number; y: number }): TargetBoardPickFlipAnim =>
	hitOffset.y < 0 ? 'v3' : 'v4';

/** Symbols drop / target board slide through the reel mask. */
export const TARGET_PICK_SLIDE_MS = 1100;

/** Extra px below the 5×4 so the plate tucks under the pulled gold rail. */
export const TARGET_PICK_BOTTOM_TUCK = 2;
/** Inset from the padded playfield so square corners stay off the frame rivets. */
export const TARGET_PICK_SIDE_INSET = 5;
/** Drop the top of the plate so it sits under the upper gold bar. */
export const TARGET_PICK_TOP_INSET = 3;

/**
 * Inner window of the slot gold frame in board-local px (top-left of the 5×4).
 * Sides are inset so the cabinet cannot paint over the gold corner chrome.
 * Height follows DESK_BOTTOM_PULL only — mask slack is independent.
 */
export const targetPickInnerClip = () => {
	const boardWidth = BOARD_SIZES.width;
	const boardHeight = BOARD_SIZES.height;
	const pivotX = boardWidth / 2;
	const pivotY = boardHeight / 2;
	const slotW = (boardWidth * DESK_PARCHMENT_PADDING.width) / DESK_PARCHMENT.widthFrac;
	const slotH = (boardHeight * DESK_PARCHMENT_PADDING.height) / DESK_PARCHMENT.heightFrac;
	const slotCenterX = pivotX + BOARD_FRAME_OFFSET.x - DESK_PARCHMENT.offsetXFrac * slotW;
	const slotCenterY =
		pivotY + BOARD_FRAME_OFFSET.y - DESK_PARCHMENT.offsetYFrac * slotH + DESK_VISUAL_OFFSET_Y;
	const pfW = boardWidth * DESK_PARCHMENT_PADDING.width;
	const playH = boardHeight * DESK_PARCHMENT_PADDING.height;
	const pfCx = DESK_PARCHMENT.offsetXFrac * slotW;
	const pfCy = DESK_PARCHMENT.offsetYFrac * slotH;
	const pfTop = pfCy - playH / 2;
	const pfLeft = pfCx - pfW / 2;
	return {
		x: slotCenterX + pfLeft + TARGET_PICK_SIDE_INSET,
		y: slotCenterY + pfTop + TARGET_PICK_TOP_INSET,
		width: pfW - TARGET_PICK_SIDE_INSET * 2,
		height: playH - TARGET_PICK_TOP_INSET - DESK_BOTTOM_PULL_PX + TARGET_PICK_BOTTOM_TUCK + 13,
	};
};

/**
 * Seat flip viewport. Skeleton uses scaleY = -1 (same as full-board QA),
 * so the disc around container y≈257 lands near y≈−257.
 */
export const TARGET_BOARD_FLIP_VIEWPORT = {
	x: -220,
	y: -480,
	width: 440,
	height: 440,
	padLeft: '0%',
	padRight: '0%',
	padTop: '0%',
	padBottom: '0%',
} as const;

/** Slots kept visible during seat flip (disc only). */
export const TARGET_BOARD_FLIP_VISIBLE_SLOTS = ['front', 'back'] as const;

/**
 * Six target seats on the wooden shelves (fractions of background plate).
 * Tuned against designer_assets/target/images/background.png.
 */
export const TARGET_BOARD_SLOTS = [
	{ x: 0.24, y: 0.42 },
	{ x: 0.5, y: 0.42 },
	{ x: 0.76, y: 0.42 },
	{ x: 0.26, y: 0.78 },
	{ x: 0.5, y: 0.78 },
	{ x: 0.76, y: 0.78 },
] as const;

/**
 * Stage E — 9 seats (3×3) on the same 6-target plate until the dedicated
 * shoot-board texture lands. Packed under the nameplate / above the plinth.
 */
export const TARGET_SHOOT_SEAT_COUNT = 9;
export const TARGET_SHOOT_SLOTS = [
	{ x: 0.24, y: 0.34 },
	{ x: 0.5, y: 0.34 },
	{ x: 0.76, y: 0.34 },
	{ x: 0.24, y: 0.56 },
	{ x: 0.5, y: 0.56 },
	{ x: 0.76, y: 0.56 },
	{ x: 0.24, y: 0.78 },
	{ x: 0.5, y: 0.78 },
	{ x: 0.76, y: 0.78 },
] as const;

/** Board-local drop so stands sit a few px lower on the shelf. */
export const TARGET_PICK_SEAT_Y_NUDGE = 5;

export const TARGET_PICK_SEAT_WIDTH_FRAC = 0.225;
/** Slightly smaller discs so 3×3 fits the temporary 6-target wood. */
export const TARGET_SHOOT_SEAT_WIDTH_FRAC = 0.175;
export const TARGET_PICK_DISC_LIFT_FRAC = 0.18;
export const TARGET_PICK_HOLDER_WIDTH_FRAC = 1.22;
export const TARGET_PICK_HOLDER_ASPECT = 286 / 521;
export const TARGET_PICK_HOLDER_TOP_FRAC = 0.58;

export const targetBoardSlotPoint = (
	slot: { x: number; y: number },
	box: { x: number; y: number; width: number; height: number },
) => ({
	x: box.x + ((slot.x - TARGET_BOARD_CONTENT.left) / TARGET_BOARD_CONTENT.width) * box.width,
	y:
		box.y +
		((slot.y - TARGET_BOARD_CONTENT.top) / TARGET_BOARD_CONTENT.height) * box.height +
		TARGET_PICK_SEAT_Y_NUDGE,
});

/** Sample FS faces for DEV pick preview (matches freeSpinTargetPickDemo). */
export const TARGET_BOARD_DEV_VALUES = [12, 8, 10, 8, 12, 10] as const;

export const TARGET_BOARD_SPINE_FILES = [
	'target_board.json',
	'target_board.atlas',
	'target_board.webp',
] as const;

export const TARGET_BOARD_SPINE_ASSET_URLS = TARGET_BOARD_SPINE_FILES.map(
	resolveTargetBoardSpineUrl,
);

export const TARGET_BOARD_SPRITE_URLS = [
	TARGET_BOARD_SPRITES.background,
	TARGET_BOARD_SPRITES.front,
	TARGET_BOARD_SPRITES.back,
	TARGET_BOARD_SPRITES.holder,
] as const;

let targetBoardPreloadStarted = false;

/** Warm target-board sprites + spine during loading idle / before first pick. */
export const startTargetBoardPreload = () => {
	if (targetBoardPreloadStarted || typeof window === 'undefined') return;
	targetBoardPreloadStarted = true;

	const queue = [...TARGET_BOARD_SPRITE_URLS, ...TARGET_BOARD_SPINE_ASSET_URLS];
	const workerCount = Math.min(3, queue.length);

	void Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (queue.length > 0) {
				const url = queue.shift();
				if (!url) break;
				try {
					await fetch(url);
				} catch {
					/* Best-effort — SpinePlayer / <img> will retry on use. */
				}
			}
		}),
	);
};
