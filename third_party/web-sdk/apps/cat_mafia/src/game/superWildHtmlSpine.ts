/** designer_assets/wild_files/wild_render — Super Wild column open (Pixi Spine). */

import { BOARD_DIMENSIONS, SYMBOL_SIZE } from './constants';

/**
 * Spine camera over the export (same AABB as the HTML SpinePlayer framing).
 */
export const SUPER_WILD_SPINE_VIEWPORT = {
	x: -501,
	y: -3579.53,
	width: 1002,
	height: 4090.69,
	padLeft: '0%',
	padRight: '0%',
	padTop: '0%',
	padBottom: '0%',
} as const;

export const SUPER_WILD_OPEN_ANIM = 'open';
export const SUPER_WILD_IDLE_ANIM = 'idle';
/** Designer clip: cat turns the drum after the curtain opens. */
export const SUPER_WILD_WIN_ANIM = 'win';
/** Native Spine `open` clip length at 1×. */
export const SUPER_WILD_OPEN_NATIVE_MS = 670;
/** Native Spine `win` (cat + drum) length at 1×. */
export const SUPER_WILD_WIN_NATIVE_MS = 2133;
/** Wall-clock Spine `open` (lying WILD foot falls / curtain opens up) + symbol drop. */
export const SUPER_WILD_OPEN_MS = 1500;
/**
 * Spine `open` frame-0: lying WILD replaces the board SW and is the curtain foot.
 * It falls to the column bottom while the rest of the curtain opens upward.
 */
export const SUPER_WILD_OPEN_FROM_BOTTOM = false;
/** Wheel spin after the curtain has fully opened (matches stretched `win`). */
export const SUPER_WILD_WHEEL_SPIN_MS = 1600;
/**
 * Wall-clock for designer `win` (cat winds the drum).
 * Native clip ≈ 2.13s — keep near real timing so the gesture reads.
 */
export const SUPER_WILD_WIN_MS = 1800;
/**
 * Fraction through `win` when the mult drum spin starts (0 = start, 1 = end).
 * ~0.5 = mid gesture — cat has grabbed the wheel, then the drum takes over.
 */
export const SUPER_WILD_WIN_WHEEL_START_FRAC = 0.5;
/** Total expanding wait: open → cat mid-win → wheel land (win overlaps spin). */
export const SUPER_WILD_PRESENT_MS =
	SUPER_WILD_OPEN_MS +
	SUPER_WILD_WIN_MS * SUPER_WILD_WIN_WHEEL_START_FRAC +
	SUPER_WILD_WHEEL_SPIN_MS;
/**
 * Other reel symbols slide under the board during `open` (SW itself is hidden —
 * replaced by the Spine lying tile).
 */
export const SUPER_WILD_DROP_MS = SUPER_WILD_OPEN_MS;
/** Board-local px other symbols travel down during reveal. */
export const SUPER_WILD_DROP_DIST = SYMBOL_SIZE * (BOARD_DIMENSIONS.y + 1.25);
/**
 * Super bonus first spin: already-open sticky curtain slides in from above
 * (idle pose, no Spine `open`).
 */
export const SUPER_WILD_STICKY_DROP_IN_MS = 720;
/** Start offset above settled column (board-local px, positive = how far above). */
export const SUPER_WILD_STICKY_DROP_IN_DIST = SYMBOL_SIZE * (BOARD_DIMENSIONS.y + 0.35);
/**
 * Super intro wait: dropIn → cat mid-win → wheel land (same spin as expand,
 * without Spine `open`).
 */
export const SUPER_WILD_STICKY_PRESENT_MS =
	SUPER_WILD_STICKY_DROP_IN_MS +
	SUPER_WILD_WIN_MS * SUPER_WILD_WIN_WHEEL_START_FRAC +
	SUPER_WILD_WHEEL_SPIN_MS;
/**
 * Base next-spin: idle curtain slides under the board mask while reels scroll
 * (solid Spine art — never swaps to a 4-tile Wild.webp stack).
 * Duration is derived from reelSpinSpeed × DIST so the curtain keeps pace
 * with the strip (no gap above). Kept only as a slow-path fallback.
 */
export const SUPER_WILD_DISMISS_MS = 720;
/** Travel down during dismiss (board-local px). */
export const SUPER_WILD_DISMISS_DIST = SUPER_WILD_DROP_DIST;

/** Atlas / render height of the lying WILD in open_0 (frac of viewport). */
export const SUPER_WILD_OPEN0_H_FRAC = 0.24957;
/**
 * Center of the lying WILD in open_0, measured from the top of the viewport.
 * Remeasured from WILD_F_1 `open` t=0 (main18 + WILD attachment).
 */
export const SUPER_WILD_OPEN0_CENTER_FROM_TOP = 0.12818;
/**
 * Extra Y when aligning open_0 to the board SW cell (px, positive = DOWN).
 * Cell Y already uses padded playfield centers — keep 0 so the lying WILD
 * replaces the SW on its row (a ±SYMBOL_SIZE nudge puts it one row off).
 */
export const SUPER_WILD_OPEN0_ALIGN_Y_PX = 0;

/**
 * Column-local Y of the open_0 lying WILD center when the spine is in the
 * settled viewport fit (Y-down, origin = column mid).
 */
export const getSuperWildOpen0TileCenterLocalY = (boxHeight: number) =>
	-boxHeight * 0.5 + SUPER_WILD_OPEN0_CENTER_FROM_TOP * boxHeight;

/**
 * Playfield center Y for a padded board row (1..y).
 * Matches stopped reels (`reelY = -SYMBOL_SIZE`) and PaylineOverlay — NOT
 * `getSymbolY`, which treats the index as if reelY were 0.
 */
export const getSuperWildOriginCellY = (paddedRow: number) => (paddedRow - 0.5) * SYMBOL_SIZE;
/**
 * Column box vs reel cell / board height.
 * Y can be >1 to reach the gold bottom rail.
 */
export const SUPER_WILD_COLUMN_COVER_X = 1.0;
export const SUPER_WILD_COLUMN_COVER_Y = 1.0057;
/**
 * Extra board-local Y shift of the column box.
 * Positive = DOWN, negative = UP.
 */
export const SUPER_WILD_OFFSET_Y_PX = 0;
/**
 * Extra X for curtain column centers (game-space px). Negative = LEFT.
 * Reels 0–2 (cols 1–3) stay left-nudged; col 4 right a bit; col 5 left.
 */
export const SUPER_WILD_COLUMN_OFFSET_X_PX: Readonly<Record<number, number>> = {
	0: 1,
	1: 1,
	2: 0,
	3: 1.25, // col 4 — right of the shared −12 nudge
	4: -0.75, // col 5 — left
};

/** Wheel sectors under the pointer (8 × 45°). Math mults ×2/×4/×6/×8. */
export const SUPER_WILD_WHEEL_SECTORS = [2, 4, 6, 8, 2, 4, 6, 8] as const;
export const SUPER_WILD_WHEEL_SECTOR_DEG = 45;
/** Extra full turns before landing on the math mult. */
export const SUPER_WILD_WHEEL_SPINS = 5;

/** Drum center as a fraction of the curtain box (legacy HTML overlay; Pixi uses wheel bone). */
export const SUPER_WILD_DRUM_CENTER_Y = 0.61;
export const SUPER_WILD_DRUM_SIZE_FRAC = 0.78;
/** Label distance from drum center as a fraction of wheel attachment size (diameter).
 *  Higher = toward the outer rim (visually higher in the top cells). */
export const SUPER_WILD_DRUM_LABEL_RADIUS = 0.3;
/** Label font size as a fraction of wheel attachment size. */
export const SUPER_WILD_DRUM_LABEL_FONT_FRAC = 0.135;
/**
 * Angular offset (deg) from bone-local 0° to the center of sector 0.
 * 0 = cell centered under the pointer; 22.5 = spoke under the pointer.
 */
export const SUPER_WILD_DRUM_SECTOR_OFFSET_DEG = 22.5;

/**
 * Landed mult badge — fraction of curtain height from the TOP of the column
 * into the wood arch above the small WILD ribbon.
 */
export const SUPER_WILD_RESULT_BADGE_Y_FRAC = 0.08;
/** Badge font size as a fraction of curtain column width. */
export const SUPER_WILD_RESULT_BADGE_FONT_FRAC = 0.32;
/** Fade / pop-in duration for the landed top × badge. */
export const SUPER_WILD_RESULT_BADGE_FADE_MS = 420;

export const superWildWheelEndDeg = (mult: number, spins = SUPER_WILD_WHEEL_SPINS) => {
	const sectors = SUPER_WILD_WHEEL_SECTORS as readonly number[];
	let idx = sectors.indexOf(mult);
	if (idx < 0) {
		// Unknown / legacy ×1 — land on first ×2 sector.
		idx = 0;
	}
	// Rotate so sector idx's mid-angle (idx×45 + offset) sits under the pointer.
	return -(spins * 360 + idx * SUPER_WILD_WHEEL_SECTOR_DEG + SUPER_WILD_DRUM_SECTOR_OFFSET_DEG);
};

export const superWildWheelStartDeg = (endDeg: number, spins = SUPER_WILD_WHEEL_SPINS) =>
	endDeg - spins * 360;

/**
 * Fit the SW viewport into a board-local column box.
 * spine-pixi maps skeleton Y-up → Pixi Y-down — same offset convention as mascot.
 */
export const getSuperWildPixiTransform = (boxWidth: number, boxHeight: number) => {
	const vp = SUPER_WILD_SPINE_VIEWPORT;
	const scale = boxHeight / vp.height;
	const cx = vp.x + vp.width * 0.5;
	const cy = vp.y + vp.height * 0.5;
	return {
		scale,
		spineX: -cx * scale,
		spineY: cy * scale,
		worldW: vp.width * scale,
		worldH: vp.height * scale,
	};
};

/** Curtain column center X — symbol center + per-reel curtain nudge (not rail nudge). */
export const getSuperWildColumnX = (reelIndex: number, symbolCenterX: number) =>
	symbolCenterX + (SUPER_WILD_COLUMN_OFFSET_X_PX[reelIndex] ?? 0);
