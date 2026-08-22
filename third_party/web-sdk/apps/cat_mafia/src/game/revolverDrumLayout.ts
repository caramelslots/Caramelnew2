import { BOARD_LAYOUT_OFFSETS } from './constants';

export const DRUM_MAX = 6;
export const DRUM_STEP_DEG = 360 / DRUM_MAX;

/**
 * Art metrics from `static/assets/sprites/revolverDrum/barrel.webp` (830²).
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

const DESKTOP_DRUM_SIZE = 104;
const MOBILE_DRUM_SIZE = 84;

/** Chamber hole / bullet size in the desktop drum box. */
export const CHAMBER_HOLE_AT_DESKTOP = (ART_HOLE_DIAMETER / ART_SIZE) * DESKTOP_DRUM_SIZE;

/**
 * CW cylinder rotation: after each load, spin so the next empty sits at top.
 * Use full steps (incl. 360° at 6) so CSS doesn't rewind 300° on the last fill.
 */
export const getDrumRotationDeg = (filledCount: number) =>
	Math.max(0, Math.min(DRUM_MAX, filledCount)) * DRUM_STEP_DEG;

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

/** Next chamber to fire: newest unspent filled slot (LIFO). */
export const getNextDrumChamberToFire = (
	filledCount: number,
	spentChambers: Record<number, true | undefined>,
) => {
	const filled = Math.max(0, Math.min(DRUM_MAX, filledCount));
	for (let slot = filled - 1; slot >= 0; slot--) {
		const ch = getDrumChamberIndexForFillSlot(slot);
		if (!spentChambers[ch]) return ch;
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

export const getDrumBoxScreenPos = (args: {
	mainLayout: { x: number; y: number; scale: number };
	layoutType: keyof typeof BOARD_LAYOUT_OFFSETS | string;
	board: { visualWidth: number; visualHeight: number; scale: number };
	isDesktop: boolean;
}) => {
	const off = BOARD_LAYOUT_OFFSETS[args.layoutType as keyof typeof BOARD_LAYOUT_OFFSETS] ?? {
		x: 0,
		y: 0,
	};
	const boardCenterX = args.mainLayout.x + off.x * args.mainLayout.scale;
	const boardCenterY = args.mainLayout.y + off.y * args.mainLayout.scale;
	const halfW = (args.board.visualWidth / 2) * args.mainLayout.scale;
	const halfH = (args.board.visualHeight / 2) * args.mainLayout.scale;
	const size = getDrumSize(args.isDesktop);
	const left = boardCenterX + halfW + 16;
	const top = boardCenterY - halfH - size * 0.35;
	return { left, top, size, centerX: left + size * 0.5, centerY: top + size * 0.5 };
};

/** Screen pos of a chamber using art fractions + current cylinder rotation. */
export const getDrumChamberScreenPos = (args: {
	mainLayout: { x: number; y: number; scale: number };
	layoutType: string;
	board: { visualWidth: number; visualHeight: number; scale: number };
	isDesktop: boolean;
	chamberIndex: number;
	rotationDeg?: number;
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
