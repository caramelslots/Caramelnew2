/** designer_assets/wild_files/wild_render — Super Wild column open (Pixi Spine). */

import type * as PIXI from 'pixi.js';

import {
	BOARD_DIMENSIONS,
	BOARD_MASK_OVERFLOW,
	BOARD_SIZES,
	DESK_BOTTOM_MASK_SLACK_PX,
	DESK_BOTTOM_PULL_PX,
	SYMBOL_SIZE,
} from './constants';
import { getSymbolX } from './utils';

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
/** Bottom outer-corner radius for SW curtains on cols 1 & 5 (board-local px). */
export const SUPER_WILD_OUTER_COLUMN_BOTTOM_RADIUS_PX = 15.5;
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
	3: 0, // col 4 — right of the shared −12 nudge
	4: 0, // col 5 — left
};

/** Wheel sectors (8 × 45° — must match Spine `wheel` art). High tier ×25/×50/×75. */
export const SUPER_WILD_WHEEL_SECTORS = [2, 4, 6, 8, 25, 50, 75, 2] as const;
export const SUPER_WILD_WHEEL_SECTOR_DEG = 45;
/** All distinct mult values on the drum (dev + docs). */
export const SUPER_WILD_WHEEL_MULTS = [2, 4, 6, 8, 25, 50, 75] as const;
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
 * 22.5° = half of 45° — first cell center on the wheel attachment.
 */
export const SUPER_WILD_DRUM_SECTOR_OFFSET_DEG = 22.5;
/**
 * Fixed drum pointer angle in wheel-bone space (deg).
 * spine-pixi Y-flip renders bone-local 180° at the visual top arch pointer.
 */
export const SUPER_WILD_DRUM_POINTER_DEG = 180;
/** Drum label for ×25 / ×50 / ×75 — slightly smaller than ×2…×8. */
export const SUPER_WILD_DRUM_LABEL_FONT_FRAC_HIGH = 0.122;
/** Top badge for high-tier mults. */
export const SUPER_WILD_RESULT_BADGE_FONT_FRAC_HIGH = 0.28;
/**
 * Drum pointer (Spine bone `main17`) — one-shot setup-pose scale.
 * Applied once to BoneData (not per-frame — idle leaves the bone unkeyed).
 */
export const SUPER_WILD_POINTER_SCALE = 0.86;
/**
 * One-shot setup-pose Y nudge on `main17` (~2–3 screen px at curtain fit).
 * Positive = toward the arch.
 */
export const SUPER_WILD_POINTER_Y_NUDGE = 50;
/** Pointer shake amplitude (deg) while the drum is spinning. */
export const SUPER_WILD_POINTER_SHAKE_DEG = 8;
/** Pointer shake frequency (Hz) at full drum speed. */
export const SUPER_WILD_POINTER_SHAKE_HZ = 7;

/**
 * Landed mult badge — fraction of curtain height from the TOP of the column
 * into the wood arch above the small WILD ribbon.
 */
export const SUPER_WILD_RESULT_BADGE_Y_FRAC = 0.08;
/** Badge font size as a fraction of curtain column width. */
export const SUPER_WILD_RESULT_BADGE_FONT_FRAC = 0.32;
/** Fade / pop-in duration for the landed top × badge. */
export const SUPER_WILD_RESULT_BADGE_FADE_MS = 420;

export const superWildDrumLabelFontFrac = (mult: number) =>
	mult >= 25 ? SUPER_WILD_DRUM_LABEL_FONT_FRAC_HIGH : SUPER_WILD_DRUM_LABEL_FONT_FRAC;

export const superWildResultBadgeFontFrac = (mult: number) =>
	mult >= 25 ? SUPER_WILD_RESULT_BADGE_FONT_FRAC_HIGH : SUPER_WILD_RESULT_BADGE_FONT_FRAC;

/** Sector index for landing — first match for duplicated ×2…×8 cells. */
export const superWildWheelSectorIndex = (mult: number) => {
	const target = mult === 1 ? 2 : mult;
	const sectors = SUPER_WILD_WHEEL_SECTORS as readonly number[];
	const idx = sectors.indexOf(target);
	return idx < 0 ? 0 : idx;
};

/** Randomize drum face labels for one spin (8 cells — same multiset as `SUPER_WILD_WHEEL_SECTORS`). */
export const shuffleSuperWildDrumLabels = (): number[] => {
	const pool = [...SUPER_WILD_WHEEL_SECTORS];
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const tmp = pool[i];
		pool[i] = pool[j];
		pool[j] = tmp;
	}
	return pool;
};

/** Which physical sector holds the math mult after a shuffle (first match for duplicate ×2). */
export const superWildDrumLandSectorIndex = (
	labels: readonly number[],
	targetMult: number,
): number => {
	const target = targetMult === 1 ? 2 : targetMult;
	const idx = labels.indexOf(target);
	return idx < 0 ? superWildWheelSectorIndex(targetMult) : idx;
};

/** Mid-angle (deg) of sector `idx` on the wheel bone. */
export const superWildWheelSectorMidDeg = (idx: number) =>
	idx * SUPER_WILD_WHEEL_SECTOR_DEG + SUPER_WILD_DRUM_SECTOR_OFFSET_DEG;

export const superWildWheelStartDeg = (endDeg: number, spins = SUPER_WILD_WHEEL_SPINS) =>
	endDeg - spins * 360;

/** Final bone rotation so physical sector `sectorIdx` sits under the fixed pointer. */
export const superWildWheelEndDegForSector = (
	sectorIdx: number,
	spins = SUPER_WILD_WHEEL_SPINS,
) => {
	const sectorMid = superWildWheelSectorMidDeg(sectorIdx);
	const landOffset = (((sectorMid - SUPER_WILD_DRUM_POINTER_DEG) % 360) + 360) % 360;
	return -(spins * 360 + landOffset);
};

/** Legacy helper — canonical sector for mult (sticky / pre-shuffle). Prefer `prepareSuperWildDrumSpin`. */
export const superWildWheelEndDeg = (mult: number, spins = SUPER_WILD_WHEEL_SPINS) =>
	superWildWheelEndDegForSector(superWildWheelSectorIndex(mult), spins);

/** Sector label physically nearest the fixed drum pointer after `wheelDeg` rotation. */
export const superWildPointerSectorIndex = (wheelDeg: number): number => {
	const n = SUPER_WILD_WHEEL_SECTORS.length;
	let best = 0;
	let bestDist = Infinity;
	for (let i = 0; i < n; i++) {
		const angle = superWildWheelSectorMidDeg(i) + wheelDeg;
		const norm = (((angle - SUPER_WILD_DRUM_POINTER_DEG) % 360) + 360) % 360;
		const dist = Math.min(norm, 360 - norm);
		if (dist < bestDist) {
			bestDist = dist;
			best = i;
		}
	}
	return best;
};

/**
 * Shuffle drum labels, then derive the landing sector + wheel angles for a known math mult.
 * The wheel stops on the shuffled cell that already shows the target — no post-stop label swap.
 */
export const prepareSuperWildDrumSpin = (targetMult: number) => {
	const labels = shuffleSuperWildDrumLabels();
	const landSectorIndex = superWildDrumLandSectorIndex(labels, targetMult);
	const endDeg = superWildWheelEndDegForSector(landSectorIndex);
	const startDeg = superWildWheelStartDeg(endDeg);
	return { labels, landSectorIndex, endDeg, startDeg };
};

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

/** Shared SW / bonusReel column box — board-local px. */
export const getSuperWildColumnBoxMetrics = () => {
	const boxW = SYMBOL_SIZE * SUPER_WILD_COLUMN_COVER_X;
	const boxH = BOARD_SIZES.height * SUPER_WILD_COLUMN_COVER_Y;
	return {
		boxW,
		boxH,
		colY: SUPER_WILD_OFFSET_Y_PX + boxH * 0.5,
		maskW: boxW * 1.08,
	};
};

/** Column anchor X — same nudge as SW curtain (cols 1 & 5 included). */
export const getSuperWildColumnAnchorX = (reelIndex: number) =>
	getSuperWildColumnX(reelIndex, getSymbolX(reelIndex, 'SW'));

/** Board hole clip — matches SuperWildCurtainPixi / BoardMask stopped geometry. */
export const drawSuperWildBoardClipMask = (g: PIXI.Graphics) => {
	const maskTop = BOARD_MASK_OVERFLOW.top;
	const maskBottom = Math.max(
		0,
		BOARD_MASK_OVERFLOW.bottom - DESK_BOTTOM_PULL_PX + DESK_BOTTOM_MASK_SLACK_PX,
	);
	g.rect(
		-SYMBOL_SIZE,
		-maskTop,
		BOARD_SIZES.width + SYMBOL_SIZE * 2,
		BOARD_SIZES.height + maskTop + maskBottom,
	);
	g.fill(0xffffff);
};

/**
 * Full-column clip for one SW curtain.
 * Col 1 rounds bottom-left; col 5 rounds bottom-right (desk outer corners).
 */
export const drawSuperWildColumnMask = (
	g: PIXI.Graphics,
	width: number,
	height: number,
	reelIndex: number,
) => {
	const left = -width * 0.5;
	const top = -height * 0.5;
	const right = width * 0.5;
	const bottom = height * 0.5;
	const lastCol = BOARD_DIMENSIONS.x - 1;
	const r = Math.min(SUPER_WILD_OUTER_COLUMN_BOTTOM_RADIUS_PX, width * 0.5, height * 0.5);

	g.clear();

	if (reelIndex === 0) {
		g.moveTo(left, top);
		g.lineTo(right, top);
		g.lineTo(right, bottom);
		g.lineTo(left + r, bottom);
		g.arcTo(left, bottom, left, top, r);
	} else if (reelIndex === lastCol) {
		g.moveTo(left, top);
		g.lineTo(right, top);
		g.lineTo(right, bottom - r);
		g.arcTo(right, bottom, left, bottom, r);
		g.lineTo(left, bottom);
		g.lineTo(left, top);
	} else {
		g.rect(left, top, width, height);
	}

	g.closePath();
	g.fill(0xffffff);
};
