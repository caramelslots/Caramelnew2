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
	/** Stage E / extra-FS 9-seat cabinet (`designer_assets/9 мишеней фон.png`). */
	background9: targetBoardSpriteUrl('background_9.webp'),
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

/** Native 9-seat plate (`background_9.webp` / designer_assets/9 мишеней фон.png). */
export const TARGET_SHOOT_NATIVE = { width: 1735, height: 1399 } as const;

/**
 * Full 3-shelf cabinet — aspect ≈ 5:4, stretched to the playfield with no crop.
 */
export const TARGET_SHOOT_CONTENT = {
	left: 0,
	top: 0,
	width: 1,
	height: 1,
} as const;

type BoardContent = { left: number; top: number; width: number; height: number };

/** Seat position as % of the cropped 5×4 board (PNG-space slot → wood box). */
export const targetBoardSlotStyle = (
	slot: { x: number; y: number },
	content: BoardContent = TARGET_BOARD_CONTENT,
) => {
	const x = (slot.x - content.left) / content.width;
	const y = (slot.y - content.top) / content.height;
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
 * Extra playfield height for the cabinet after DESK_BOTTOM_PULL shrinks the
 * hole. Bump when the desk bottom rail is pulled up so the target board
 * still fills the visible window.
 */
export const TARGET_PICK_HEIGHT_EXTRA = 15;

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
		height:
			playH -
			TARGET_PICK_TOP_INSET -
			DESK_BOTTOM_PULL_PX +
			TARGET_PICK_BOTTOM_TUCK +
			TARGET_PICK_HEIGHT_EXTRA,
	};
};

/**
 * Seat flip viewport in skeleton Y-up (spine-pixi → Pixi Y-down).
 * Front/back are meshes with vertices ±211 (≈422 diameter) on `container`
 * @ y≈256.84. Atlas width 291 is the texture only — do NOT use it for scale.
 */
export const TARGET_BOARD_FLIP_VIEWPORT = {
	x: -211,
	y: 256.84 - 211,
	width: 422,
	height: 422,
	padLeft: '0%',
	padRight: '0%',
	padTop: '0%',
	padBottom: '0%',
} as const;

/** Pixi tir flip — one seat disc at screen position. */
export type TargetShotFlipFx = {
	nonce: number;
	/** Seat index — used when several flips run in parallel. */
	seatIndex?: number;
	anim: TargetBoardPickFlipAnim;
	value: number;
	displayText?: string;
	showFsLabel?: boolean;
	/** Seat / disc center in canvas px. */
	x: number;
	y: number;
	/** Seat box size (px) — disc fills this. */
	size: number;
};

export type TargetShotFlipLabelFx = {
	visible: boolean;
	scaleX: number;
	scaleY: number;
};

/**
 * Fit flip viewport into a seat-sized box; disc center at local origin.
 * Same spine offset convention as `getMascotPixiTransform`.
 */
export const getTargetFlipPixiTransform = (seatSize: number) => {
	const vp = TARGET_BOARD_FLIP_VIEWPORT;
	const scale = seatSize / vp.width;
	const cx = vp.x + vp.width * 0.5;
	const cy = vp.y + vp.height * 0.5;
	return {
		scale,
		spineX: -cx * scale,
		spineY: cy * scale,
	};
};

/** Slots kept visible during seat flip (disc + volumetric edge strip). */
export const TARGET_BOARD_FLIP_VISIBLE_SLOTS = ['front', 'back', 'edge'] as const;

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
 * Stage E — 9 seats (3×3) on background_9.webp (three shelves under the plaque).
 */
export const TARGET_SHOOT_SEAT_COUNT = 9;
export const TARGET_SHOOT_SLOTS = [
	{ x: 0.2, y: 0.26 },
	{ x: 0.5, y: 0.26 },
	{ x: 0.8, y: 0.26 },
	{ x: 0.2, y: 0.55 },
	{ x: 0.5, y: 0.55 },
	{ x: 0.8, y: 0.55 },
	{ x: 0.2, y: 0.85 },
	{ x: 0.5, y: 0.85 },
	{ x: 0.8, y: 0.85 },
] as const;

/** Board-local drop so stands sit a few px lower on the shelf. */
export const TARGET_PICK_SEAT_Y_NUDGE = 5;

export const TARGET_PICK_SEAT_WIDTH_FRAC = 0.225;
/** Disc size on the 3-shelf Stage E plate. */
export const TARGET_SHOOT_SEAT_WIDTH_FRAC = 0.175;
export const TARGET_PICK_DISC_LIFT_FRAC = 0.18;
export const TARGET_PICK_HOLDER_WIDTH_FRAC = 1.22;
export const TARGET_PICK_HOLDER_ASPECT = 286 / 521;
export const TARGET_PICK_HOLDER_TOP_FRAC = 0.58;

export const targetBoardSlotPoint = (
	slot: { x: number; y: number },
	box: { x: number; y: number; width: number; height: number },
	content: BoardContent = TARGET_BOARD_CONTENT,
) => ({
	x: box.x + ((slot.x - content.left) / content.width) * box.width,
	y: box.y + ((slot.y - content.top) / content.height) * box.height + TARGET_PICK_SEAT_Y_NUDGE,
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
	TARGET_BOARD_SPRITES.background9,
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
