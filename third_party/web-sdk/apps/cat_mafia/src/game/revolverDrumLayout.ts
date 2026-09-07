import {
	BOARD_LAYOUT_OFFSETS,
	BOARD_LAYOUT_SCALE,
	BOARD_SIZES,
	DESK_BOTTOM_PULL_PX,
	DESK_PARCHMENT,
	DESK_VISUAL_OFFSET_Y,
} from './constants';
import type { createLayout } from 'utils-layout';

type LayoutDerived = ReturnType<typeof createLayout>['stateLayoutDerived'];

export const DRUM_MAX = 6;
export const DRUM_STEP_DEG = 360 / DRUM_MAX;

/**
 * Art metrics from `static/assets/sprites/fsExtraCounter/barrel.webp` (830²).
 * Centres from light pocket-rim fits — no extra angle/radial nudges.
 */
const ART_SIZE = 830;
/** Hole diameter so brass fills the pocket (was 178 — left a visible dark ring). */
const ART_HOLE_DIAMETER = 196;

/**
 * Chamber centres as fractions of art size, index 0 = top, then CW.
 */
export const CHAMBER_POS_FRAC: ReadonlyArray<{ x: number; y: number }> = [
	{ x: 413.32 / ART_SIZE, y: 160.53 / ART_SIZE },
	{ x: 634.79 / ART_SIZE, y: 288.29 / ART_SIZE },
	{ x: 634.62 / ART_SIZE, y: 541.12 / ART_SIZE },
	{ x: 414.12 / ART_SIZE, y: 667.26 / ART_SIZE },
	{ x: 195.12 / ART_SIZE, y: 541.7 / ART_SIZE },
	{ x: 194.49 / ART_SIZE, y: 288.77 / ART_SIZE },
];

/** Reference hole size on PC desktop (screen px at mainLayout.scale ≈ 1). */
const DESKTOP_DRUM_SIZE = 96;
const MOBILE_DRUM_SIZE = 84;

/**
 * Drum hole as a fraction of on-screen board width — locks PC proportions so
 * Popout L/S scale the rim+barrel with the board instead of a fixed px size.
 */
const DRUM_HOLE_FRAC_OF_BOARD_WIDTH =
	DESKTOP_DRUM_SIZE / (BOARD_SIZES.width * BOARD_LAYOUT_SCALE.desktop);

/**
 * Desktop gold rim art (`barrel_rim.webp` 484×418) — left mounts + circular hole.
 * Barrel is centred on the hole and sized 1:1 to the inner opening.
 */
const RIM_ART_W = 484;
const RIM_ART_H = 418;
/** Inner hole diameter in art px (circle fit on opaque ring inner edge). */
const RIM_INNER_DIAMETER = 344;
const RIM_CIRCLE_CX = 274.1;
const RIM_CIRCLE_CY = 208.6;
/** 1 = barrel fills the rim hole exactly (rim drawn above as the frame). */
const DRUM_IN_RIM_SCALE = 1;
/**
 * Mount inset as a fraction of on-screen board width (PC-tuned −18px @ ~610px board).
 * More negative = further to the right of the board edge.
 */
const RIM_MOUNT_OVERLAP_FRAC = 20 / (BOARD_SIZES.width * BOARD_LAYOUT_SCALE.desktop);
/**
 * Vertical centre of the drum/rim as a fraction of board height from the top.
 * Lower = higher on the board (spinboard uses its own frac in FreeSpinCounter).
 */
const DESKTOP_CHROME_CENTER_Y_FRAC = 0.12;

/**
 * Phone portrait: same rim+barrel as PC, rotated so left mounts become top
 * mounts and the counter hangs under the gold frame (bottom-left).
 */
const PORTRAIT_RIM_ANGLE_DEG = 90;
/** Hole vs on-screen parchment width — a bit larger than PC so it reads on phones. */
const PORTRAIT_DRUM_HOLE_FRAC = 0.2;
/** Circle centre as a fraction of desk width from the left gold edge. */
const PORTRAIT_CHROME_CENTER_X_FRAC = 0.26;
/**
 * Mount inset from the visual desk bottom (fraction of desk height).
 * Negative = overlap the bottom gold rail (higher on screen).
 */
const PORTRAIT_MOUNT_OVERLAP_FRAC = -0.045;

/** Chamber hole / bullet size in the desktop drum box. */
export const CHAMBER_HOLE_AT_DESKTOP = (ART_HOLE_DIAMETER / ART_SIZE) * DESKTOP_DRUM_SIZE;

/** Side-chrome drum hole in screen px — scales with board on Desktop / Popout / Laptop. */
export const getSideChromeDrumHoleSize = (args: {
	board: { visualWidth: number };
	mainLayout: { scale: number };
}) => Math.max(28, args.board.visualWidth * args.mainLayout.scale * DRUM_HOLE_FRAC_OF_BOARD_WIDTH);

/** Rim sprite size so the inner hole matches `holeSize`. */
export const getDrumRimSize = (holeSize: number) => {
	const scale = holeSize / RIM_INNER_DIAMETER;
	return { width: RIM_ART_W * scale, height: RIM_ART_H * scale, scale };
};

/** Circle (drum) centre inside the rim sprite, local top-left coords. */
export const getDrumRimCircleLocal = (rim: { width: number; height: number; scale: number }) => ({
	x: RIM_CIRCLE_CX * rim.scale,
	y: RIM_CIRCLE_CY * rim.scale,
});

/** Barrel sprite size seated inside the rim hole. */
export const getDrumSizeInRim = (holeSize: number) => holeSize * DRUM_IN_RIM_SCALE;

type DrumRimBox = {
	left: number;
	top: number;
	width: number;
	height: number;
	centerX: number;
	centerY: number;
	/** CW degrees around the rim sprite centre (0 = PC left-mount). */
	angle: number;
};

type DrumChromeBox = {
	left: number;
	top: number;
	size: number;
	holeSize: number;
	centerX: number;
	centerY: number;
	rim: DrumRimBox;
};

/** Screen Y-down: 90° CW around (cx, cy). */
const rotateLocalCw90 = (x: number, y: number, cx: number, cy: number) => ({
	x: cx - (y - cy),
	y: cy + (x - cx),
});

const buildChromeBox = (opts: {
	holeSize: number;
	rimLeft: number;
	rimTop: number;
	circleX: number;
	circleY: number;
	angle?: number;
}): DrumChromeBox => {
	const size = getDrumSizeInRim(opts.holeSize);
	const rim = getDrumRimSize(opts.holeSize);
	const centerX = opts.rimLeft + opts.circleX;
	const centerY = opts.rimTop + opts.circleY;
	return {
		left: centerX - size * 0.5,
		top: centerY - size * 0.5,
		size,
		holeSize: opts.holeSize,
		centerX,
		centerY,
		rim: {
			left: opts.rimLeft,
			top: opts.rimTop,
			width: rim.width,
			height: rim.height,
			centerX: opts.rimLeft + rim.width * 0.5,
			centerY: opts.rimTop + rim.height * 0.5,
			angle: opts.angle ?? 0,
		},
	};
};

/**
 * CW cylinder rotation: after each load, spin so the next empty sits at top.
 * Use full steps (incl. 360° at 6) so CSS doesn't rewind 300° on the last fill.
 */
export const getDrumRotationDeg = (filledCount: number) =>
	Math.max(0, Math.min(DRUM_MAX, filledCount)) * DRUM_STEP_DEG;

/**
 * Chamber currently at the fire / load port (12 o'clock = position 1).
 * Positive `rotationDeg` is CW (CSS); shoot advances by decreasing it (CCW).
 */
export const getChamberAtFirePosition = (rotationDeg: number) => {
	const steps = ((Math.round(rotationDeg / DRUM_STEP_DEG) % DRUM_MAX) + DRUM_MAX) % DRUM_MAX;
	return (DRUM_MAX - steps) % DRUM_MAX;
};

/**
 * Fill order for CW rotation: slot 0→chamber 0, slot 1→5, slot 2→4, …
 * `(-slot) mod 6`.
 */
export const getDrumChamberIndexForFillSlot = (fillSlot: number) =>
	(((DRUM_MAX - (fillSlot % DRUM_MAX)) % DRUM_MAX) + DRUM_MAX) % DRUM_MAX;

/** Inverse: which fill slot occupies chamber `i`. */
export const getDrumFillSlotForChamber = (chamberIndex: number) =>
	getDrumChamberIndexForFillSlot(chamberIndex);

export const isDrumChamberFilled = (chamberIndex: number, filledCount: number) =>
	getDrumFillSlotForChamber(chamberIndex) < filledCount;

export const isDrumChamberLive = (
	chamberIndex: number,
	filledCount: number,
	spentChambers: Record<number, true | undefined>,
) => isDrumChamberFilled(chamberIndex, filledCount) && !spentChambers[chamberIndex];

/** Random CARAMEL spin for a newly seated bullet. */
export const randomDrumBulletOrientDeg = () => Math.random() * 360;

/** Assign a random orient for `chamberIndex`. */
export const withDrumBulletOrient = (
	orients: Record<number, number>,
	chamberIndex: number,
): Record<number, number> => ({
	...orients,
	[chamberIndex]: randomDrumBulletOrientDeg(),
});

/** Ensure every filled chamber has an orient (e.g. after book sync / stories). */
export const syncDrumBulletOrients = (
	orients: Record<number, number>,
	filledCount: number,
): Record<number, number> => {
	const next = { ...orients };
	const filled = Math.max(0, Math.min(DRUM_MAX, filledCount));
	for (let slot = 0; slot < filled; slot++) {
		const ch = getDrumChamberIndexForFillSlot(slot);
		if (next[ch] == null) next[ch] = randomDrumBulletOrientDeg();
	}
	return next;
};

/** Empty chamber currently at 12 o'clock (fly-in target). */
export const getDrumLoadChamberIndex = (filledCount: number) =>
	filledCount >= DRUM_MAX ? null : getDrumChamberIndexForFillSlot(filledCount);

/** Most recently loaded chamber (used when firing). */
export const getDrumLastFilledChamberIndex = (filledCount: number) =>
	filledCount <= 0 ? null : getDrumChamberIndexForFillSlot(filledCount - 1);

/**
 * Next chamber to fire: walk CCW from the current fire position until a live
 * round is found (skips empties left after a partial load).
 */
export const getNextDrumChamberToFire = (
	filledCount: number,
	spentChambers: Record<number, true | undefined>,
	rotationDeg = getDrumRotationDeg(filledCount),
) => {
	const filled = Math.max(0, Math.min(DRUM_MAX, filledCount));
	if (filled <= 0) return null;
	const start = getChamberAtFirePosition(rotationDeg);
	for (let i = 0; i < DRUM_MAX; i++) {
		const ch = (start + i) % DRUM_MAX;
		if (isDrumChamberLive(ch, filled, spentChambers)) return ch;
	}
	return null;
};

/** @deprecated polar helper — prefer `CHAMBER_POS_FRAC`. Kept for fly math fallback. */
export const getDrumChamberAngleDeg = (chamberIndex: number) =>
	(chamberIndex % DRUM_MAX) * DRUM_STEP_DEG;

export const DRUM_CHAMBER_ATTR = 'data-drum-chamber';
export const DRUM_HUB_ATTR = 'data-drum-hub';
/** Marks the empty chamber currently at the top (fly-in target). */
export const DRUM_LOAD_ATTR = 'data-drum-load';

export const getDrumSize = (isDesktop: boolean) =>
	isDesktop ? DESKTOP_DRUM_SIZE : MOBILE_DRUM_SIZE;

/** Gold desk slot in screen px — same geometry as BoardFrame. */
const getDeskScreenRect = (args: {
	boardCenterX: number;
	boardCenterY: number;
	boardScreenW: number;
	boardScreenH: number;
	boardScale: number;
	mainScale: number;
}) => {
	const slotW = args.boardScreenW / DESK_PARCHMENT.widthFrac;
	const slotH = args.boardScreenH / DESK_PARCHMENT.heightFrac;
	const centerX = args.boardCenterX - DESK_PARCHMENT.offsetXFrac * slotW;
	const centerY =
		args.boardCenterY -
		DESK_PARCHMENT.offsetYFrac * slotH +
		DESK_VISUAL_OFFSET_Y * args.boardScale * args.mainScale;
	const pull = DESK_BOTTOM_PULL_PX * args.boardScale * args.mainScale;
	return {
		left: centerX - slotW * 0.5,
		bottom: centerY + slotH * 0.5 - pull,
		width: slotW,
		height: slotH - pull,
	};
};

/** Phone portrait: rim+barrel hanging from the bottom-left gold rail. */
const getPortraitHangingDrumBox = (args: {
	boardCenterX: number;
	boardCenterY: number;
	boardScreenW: number;
	boardScreenH: number;
	boardScale: number;
	mainScale: number;
}): DrumChromeBox => {
	const holeSize = Math.max(56, args.boardScreenW * PORTRAIT_DRUM_HOLE_FRAC);
	const rim = getDrumRimSize(holeSize);
	const circle = getDrumRimCircleLocal(rim);
	const rcx = rim.width * 0.5;
	const rcy = rim.height * 0.5;
	const rotCircle = rotateLocalCw90(circle.x, circle.y, rcx, rcy);
	const rotMount = rotateLocalCw90(0, rcy, rcx, rcy);

	const desk = getDeskScreenRect(args);
	const centerX = desk.left + desk.width * PORTRAIT_CHROME_CENTER_X_FRAC;
	const mountY = desk.bottom + desk.height * PORTRAIT_MOUNT_OVERLAP_FRAC;

	return buildChromeBox({
		holeSize,
		rimLeft: centerX - rotCircle.x,
		rimTop: mountY - rotMount.y,
		circleX: rotCircle.x,
		circleY: rotCircle.y,
		angle: PORTRAIT_RIM_ANGLE_DEG,
	});
};

export const getDrumBoxScreenPos = (args: {
	mainLayout: { x: number; y: number; scale: number };
	layoutType: keyof typeof BOARD_LAYOUT_OFFSETS | string;
	board: { visualWidth: number; visualHeight: number; scale: number };
	isDesktop: boolean;
	/** Kept for callers — portrait no longer uses the Buy Bonus slot. */
	layoutDerived?: LayoutDerived;
}) => {
	const off = BOARD_LAYOUT_OFFSETS[args.layoutType as keyof typeof BOARD_LAYOUT_OFFSETS] ?? {
		x: 0,
		y: 0,
	};
	const boardCenterX = args.mainLayout.x + off.x * args.mainLayout.scale;
	const boardCenterY = args.mainLayout.y + off.y * args.mainLayout.scale;
	const boardScreenW = args.board.visualWidth * args.mainLayout.scale;
	const boardScreenH = args.board.visualHeight * args.mainLayout.scale;
	const halfW = boardScreenW * 0.5;
	const halfH = boardScreenH * 0.5;

	// Phone portrait (Mobile L/M/S): same chrome as PC, hung under the desk.
	// Popout S/L are landscape — they use the side rim path below.
	if (args.layoutType === 'portrait') {
		return getPortraitHangingDrumBox({
			boardCenterX,
			boardCenterY,
			boardScreenW,
			boardScreenH,
			boardScale: args.board.scale,
			mainScale: args.mainLayout.scale,
		});
	}

	const holeSize = getSideChromeDrumHoleSize({
		board: args.board,
		mainLayout: args.mainLayout,
	});
	const circle = getDrumRimCircleLocal(getDrumRimSize(holeSize));
	const rimLeft = boardCenterX + halfW + boardScreenW * RIM_MOUNT_OVERLAP_FRAC;
	const chromeCenterY = boardCenterY - halfH + halfH * 2 * DESKTOP_CHROME_CENTER_Y_FRAC;
	return buildChromeBox({
		holeSize,
		rimLeft,
		rimTop: chromeCenterY - circle.y,
		circleX: circle.x,
		circleY: circle.y,
	});
};

/** Screen pos of a chamber using art fractions + current cylinder rotation. */
export const getDrumChamberScreenPos = (args: {
	mainLayout: { x: number; y: number; scale: number };
	layoutType: string;
	board: { visualWidth: number; visualHeight: number; scale: number };
	isDesktop: boolean;
	chamberIndex: number;
	rotationDeg?: number;
	layoutDerived?: LayoutDerived;
}) => {
	const box = getDrumBoxScreenPos(args);
	const pos = CHAMBER_POS_FRAC[args.chamberIndex % DRUM_MAX];
	const localX = (pos.x - 0.5) * box.size;
	const localY = (pos.y - 0.5) * box.size;
	const rad = ((args.rotationDeg ?? 0) * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const rotX = localX * cos - localY * sin;
	const rotY = localX * sin + localY * cos;
	return {
		x: box.centerX + rotX,
		y: box.centerY + rotY,
		box,
	};
};

/** Live top load-port (empty chamber at 12 o'clock). */
export const queryDrumLoadScreenPos = () => {
	if (typeof document === 'undefined') return null;
	const chamber = document.querySelector<HTMLElement>(`[${DRUM_LOAD_ATTR}]`);
	const hub = document.querySelector<HTMLElement>(`[${DRUM_HUB_ATTR}]`);
	if (!chamber) return null;

	const c = chamber.getBoundingClientRect();
	const h = hub?.getBoundingClientRect();
	const size = h ? Math.min(h.width, h.height) : DESKTOP_DRUM_SIZE;
	return {
		x: c.left + c.width * 0.5,
		y: c.top + c.height * 0.5,
		holePx: Math.min(c.width, c.height),
		box: h
			? {
					left: h.left + h.width * 0.5 - size * 0.5,
					top: h.top + h.height * 0.5 - size * 0.5,
					size,
					centerX: h.left + h.width * 0.5,
					centerY: h.top + h.height * 0.5,
				}
			: {
					left: c.left,
					top: c.top,
					size: DESKTOP_DRUM_SIZE,
					centerX: c.left + c.width * 0.5,
					centerY: c.top + c.height * 0.5,
				},
	};
};

/** Live chamber/hub centres from rendered drum nodes (authoritative). */
export const queryDrumChamberScreenPos = (chamberIndex: number) => {
	if (typeof document === 'undefined') return null;
	const chamber = document.querySelector<HTMLElement>(
		`[${DRUM_CHAMBER_ATTR}="${chamberIndex % DRUM_MAX}"]`,
	);
	const hub = document.querySelector<HTMLElement>(`[${DRUM_HUB_ATTR}]`);
	if (!chamber) return null;

	const c = chamber.getBoundingClientRect();
	const h = hub?.getBoundingClientRect();
	const size = h ? Math.min(h.width, h.height) : DESKTOP_DRUM_SIZE;
	return {
		x: c.left + c.width * 0.5,
		y: c.top + c.height * 0.5,
		holePx: Math.min(c.width, c.height),
		box: h
			? {
					left: h.left + h.width * 0.5 - size * 0.5,
					top: h.top + h.height * 0.5 - size * 0.5,
					size,
					centerX: h.left + h.width * 0.5,
					centerY: h.top + h.height * 0.5,
				}
			: {
					left: c.left,
					top: c.top,
					size: DESKTOP_DRUM_SIZE,
					centerX: c.left + c.width * 0.5,
					centerY: c.top + c.height * 0.5,
				},
	};
};
