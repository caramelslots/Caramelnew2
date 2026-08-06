import { BOARD_LAYOUT_OFFSETS } from './constants';

export const DRUM_MAX = 6;
/** Chamber orbit radius in the 88px desktop drum (matches `translateY(-28px)`). */
const DESKTOP_DRUM_SIZE = 88;
const MOBILE_DRUM_SIZE = 72;
const CHAMBER_RADIUS_AT_DESKTOP = 28;

export const DRUM_CHAMBER_ATTR = 'data-drum-chamber';
export const DRUM_HUB_ATTR = 'data-drum-hub';

export const getDrumSize = (isDesktop: boolean) =>
	isDesktop ? DESKTOP_DRUM_SIZE : MOBILE_DRUM_SIZE;

/** CSS chamber angle: same as RevolverDrumPlaceholder (`-90 + i * 60`). */
export const getDrumChamberAngleDeg = (chamberIndex: number) =>
	-90 + (chamberIndex % DRUM_MAX) * (360 / DRUM_MAX);

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
	const left = boardCenterX + halfW + 12;
	const top = boardCenterY - halfH - size * 0.35;
	return { left, top, size, centerX: left + size * 0.5, centerY: top + size * 0.5 };
};

/**
 * Offset from drum centre for chamber `i`, matching
 * `transform: rotate(angle) translateY(-radius)`.
 */
export const getDrumChamberOffset = (chamberIndex: number, radius: number) => {
	const rad = (getDrumChamberAngleDeg(chamberIndex) * Math.PI) / 180;
	return {
		x: radius * Math.sin(rad),
		y: -radius * Math.cos(rad),
	};
};

/** Math fallback when the drum DOM node isn't mounted yet. */
export const getDrumChamberScreenPos = (args: {
	mainLayout: { x: number; y: number; scale: number };
	layoutType: string;
	board: { visualWidth: number; visualHeight: number; scale: number };
	isDesktop: boolean;
	chamberIndex: number;
}) => {
	const box = getDrumBoxScreenPos(args);
	const radius = box.size * (CHAMBER_RADIUS_AT_DESKTOP / DESKTOP_DRUM_SIZE);
	const offset = getDrumChamberOffset(args.chamberIndex % DRUM_MAX, radius);
	return {
		x: box.centerX + offset.x,
		y: box.centerY + offset.y,
		box,
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
	return {
		x: c.left + c.width * 0.5,
		y: c.top + c.height * 0.5,
		holePx: Math.min(c.width, c.height),
		box: h
			? {
					left: h.left + h.width * 0.5 - 44,
					top: h.top + h.height * 0.5 - 44,
					size: 88,
					centerX: h.left + h.width * 0.5,
					centerY: h.top + h.height * 0.5,
				}
			: {
					left: c.left,
					top: c.top,
					size: 88,
					centerX: c.left + c.width * 0.5,
					centerY: c.top + c.height * 0.5,
				},
	};
};
