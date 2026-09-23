/**
 * Shared screen geometry for Duel dual-board layout.
 * Anchors both desks to the same screen space as the main Pixi board.
 */

import {
	AUTOPLAY_PILL_ASPECT,
	BOARD_SIZES,
	DESK_PARCHMENT,
	DESK_PARCHMENT_PADDING,
	isPopoutSmallViewport,
	isPopoutViewport,
} from './constants';

/** Playfield rect inside the desk texture (fractions 0..1). */
export const DUEL_PLAYFIELD = {
	left: 0.5 + DESK_PARCHMENT.offsetXFrac - DESK_PARCHMENT.widthFrac / 2,
	top: 0.5 + DESK_PARCHMENT.offsetYFrac - DESK_PARCHMENT.heightFrac / 2,
	width: DESK_PARCHMENT.widthFrac,
	height: DESK_PARCHMENT.heightFrac,
} as const;

/**
 * Dark gold-framed plaque under the playfield on the board spine nameplate slot
 * (the WIN / bank slot). Measured from the texture.
 */
export const DUEL_NAMEPLATE = {
	left: 0.2,
	top: 0.858,
	width: 0.6,
	height: 0.048,
} as const;

export type DuelScreenLayout = {
	isPortrait: boolean;
	/** Each desk panel width in CSS px. */
	boardWidth: number;
	/** Desk panel height in CSS px (matches Pixi desk aspect). */
	boardHeight: number;
	gap: number;
	vsSize: number;
	/** Dog board center (screen px). */
	dogCenter: { x: number; y: number };
	/** Cat board center (screen px). */
	catCenter: { x: number; y: number };
	/** Bottom HUD reserved band (px). */
	hudReserve: number;
	/**
	 * How much of the mascot box may overlap the desk (0..1).
	 * Higher = tucked toward the playfield; lower = farther out (may leave the canvas).
	 */
	mascotOverhang: number;
	/** Mascot height as a multiple of boardHeight (default 1.15). */
	mascotHeightScale: number;
};

type MainLayoutLike = {
	x: number;
	y: number;
	width: number;
	height: number;
	scale: number;
};

type BoardLayoutLike = {
	x: number;
	y: number;
	width: number;
	height: number;
	scale: number;
	visualWidth?: number;
	visualHeight?: number;
};

/** On-screen size of the normal single desk (Pixi BoardFrame). */
const normalDeskScreenSize = (ml: MainLayoutLike, board: BoardLayoutLike) => {
	const deskW =
		((board.width * DESK_PARCHMENT_PADDING.width) / DESK_PARCHMENT.widthFrac) *
		board.scale *
		ml.scale;
	const deskH =
		((board.height * DESK_PARCHMENT_PADDING.height) / DESK_PARCHMENT.heightFrac) *
		board.scale *
		ml.scale;
	return { deskW, deskH };
};

/**
 * How much of the mascot box may overlap the desk edge (transparent spine padding).
 * Higher = sits closer to the playfield. PC default — outer sides may leave the canvas.
 */
const DUEL_MASCOT_OVERHANG = 0.4;
/** Gap between desk edge and mascot body (fraction of board width). */
const DUEL_MASCOT_GAP_FRAC = 0.02;
/** Dog is slightly smaller than the cat on desktop / tablet / landscape (phones use faces). */
const DUEL_DOG_MASCOT_SCALE = 0.88;
/** Extra left shift for the dog (fraction of board width) — tucks farther from the desk. */
const DUEL_DOG_LEFT_NUDGE_FRAC = 0.06;

export const computeDuelScreenLayout = (opts: {
	canvasWidth: number;
	canvasHeight: number;
	layoutType: string;
	mainLayout: MainLayoutLike;
	boardLayout: BoardLayoutLike;
}): DuelScreenLayout => {
	const isPortrait = opts.layoutType === 'portrait';
	const { deskW, deskH } = normalDeskScreenSize(opts.mainLayout, opts.boardLayout);
	const aspect = deskH / Math.max(1, deskW);

	if (isPortrait) {
		// Pack both desks into the phone playfield — minimize chrome reserves.
		const hudReservePhone = Math.round(opts.canvasHeight * 0.12);
		const topReservePhone = 36;
		const availableH = Math.max(220, opts.canvasHeight - hudReservePhone - topReservePhone);
		const gap = 2;
		const maxBoardH = (availableH - gap) / 2;
		const boardWidth = Math.min(opts.canvasWidth * 0.98, maxBoardH / aspect);
		const boardHeight = boardWidth * aspect;
		const stackH = boardHeight * 2 + gap;
		const startY = topReservePhone + Math.max(0, (availableH - stackH) / 2) + boardHeight / 2;
		const cx = opts.canvasWidth * 0.5;
		return {
			isPortrait: true,
			boardWidth,
			boardHeight,
			gap,
			vsSize: 0,
			dogCenter: { x: cx, y: startY },
			catCenter: { x: cx, y: startY + boardHeight + gap },
			hudReserve: hudReservePhone,
			mascotOverhang: DUEL_MASCOT_OVERHANG,
			mascotHeightScale: 1.15,
		};
	}

	// Landscape / desktop / tablet / popout — scale to viewport, vertically center.
	const canvas = { width: opts.canvasWidth, height: opts.canvasHeight };
	const popoutS = isPopoutSmallViewport(canvas);
	const popoutL = isPopoutViewport(canvas) && !popoutS;

	if (popoutS) {
		// 400×225 — pack desks; mascots stay outboard and may clip off the sides.
		const hudReserve = Math.round(opts.canvasHeight * 0.14);
		const topReserve = Math.round(opts.canvasHeight * 0.09);
		const availableH = Math.max(80, opts.canvasHeight - hudReserve - topReserve);
		const vsSize = 0;
		const gap = 2;
		const sideGutter = 3;
		const usable = Math.max(80, opts.canvasWidth - sideGutter * 2 - vsSize - gap * 2);
		const maxBoardH = availableH * 0.9;
		const boardWidth = Math.min(usable / 2, maxBoardH / aspect);
		const boardHeight = boardWidth * aspect;
		const totalW = boardWidth * 2 + gap * 2 + vsSize;
		const left = (opts.canvasWidth - totalW) / 2;
		const cy = topReserve + availableH * 0.48;
		return {
			isPortrait: false,
			boardWidth,
			boardHeight,
			gap,
			vsSize,
			dogCenter: { x: left + boardWidth / 2, y: cy },
			catCenter: { x: left + boardWidth + gap + vsSize + gap + boardWidth / 2, y: cy },
			hudReserve,
			// Enough tuck that the cat body stays readable; slight outward nudge from desks.
			mascotOverhang: 0.4,
			mascotHeightScale: 1.05,
		};
	}

	if (popoutL) {
		// 800×450 — large desks; mascots may clip off the sides.
		const hudReserve = Math.round(opts.canvasHeight * 0.13);
		const topReserve = Math.round(opts.canvasHeight * 0.08);
		const availableH = Math.max(120, opts.canvasHeight - hudReserve - topReserve);
		const vsSize = 0;
		const gap = 3;
		const sideGutter = Math.max(opts.canvasWidth * 0.02, 6);
		const usable = Math.max(120, opts.canvasWidth - sideGutter * 2 - vsSize - gap * 2);
		const maxBoardH = availableH * 0.82;
		const boardWidth = Math.min(usable / 2, maxBoardH / aspect);
		const boardHeight = boardWidth * aspect;
		const totalW = boardWidth * 2 + gap * 2 + vsSize;
		const left = (opts.canvasWidth - totalW) / 2;
		const cy = topReserve + availableH * 0.5;
		return {
			isPortrait: false,
			boardWidth,
			boardHeight,
			gap,
			vsSize,
			dogCenter: { x: left + boardWidth / 2, y: cy },
			catCenter: { x: left + boardWidth + gap + vsSize + gap + boardWidth / 2, y: cy },
			hudReserve,
			mascotOverhang: DUEL_MASCOT_OVERHANG,
			mascotHeightScale: 1.15,
		};
	}

	// Full desktop / tablet / landscape.
	// Prioritize desk size — flanking mascots intentionally spill off the canvas edges
	// (same as PC reference: boards stay large rather than shrinking for full cats).
	const hudReserveDesk = Math.round(Math.min(150, opts.canvasHeight * 0.15));
	const topReserveDesk = Math.round(Math.min(64, Math.max(44, opts.canvasHeight * 0.07)));
	const availableH = Math.max(200, opts.canvasHeight - hudReserveDesk - topReserveDesk);

	const vsSize = 0;
	const gap = 4;
	const sideGutter = Math.max(opts.canvasWidth * 0.02, 12);
	const usable = Math.max(200, opts.canvasWidth - sideGutter * 2 - vsSize - gap * 2);
	const maxBoardH = availableH * 0.78;
	const boardWidth = Math.min(usable / 2, maxBoardH / aspect, deskW * 1.05);
	const boardHeight = boardWidth * aspect;

	const totalW = boardWidth * 2 + gap * 2 + vsSize;
	const left = (opts.canvasWidth - totalW) / 2;
	const cy = topReserveDesk + availableH * 0.5;

	return {
		isPortrait: false,
		boardWidth,
		boardHeight,
		gap,
		vsSize,
		dogCenter: { x: left + boardWidth / 2, y: cy },
		catCenter: { x: left + boardWidth + gap + vsSize + gap + boardWidth / 2, y: cy },
		hudReserve: hudReserveDesk,
		mascotOverhang: DUEL_MASCOT_OVERHANG,
		mascotHeightScale: 1.15,
	};
};

const duelMascotSize = (layout: DuelScreenLayout) => {
	const h = layout.boardHeight * layout.mascotHeightScale;
	const w = h * (520 / 440);
	return { w, h };
};

/**
 * Duel spin counter — same autoplay.webp plaque as phone FS (number only),
 * anchored on the top gold rail to the right of each desk.
 */
export const getDuelSpinCounterBox = (layout: DuelScreenLayout, side: 'cat' | 'dog') => {
	const center = side === 'cat' ? layout.catCenter : layout.dogCenter;
	const deskTop = center.y - layout.boardHeight * 0.5;
	const width = layout.boardWidth * PORTRAIT_FS_COUNTER_WIDTH_FRAC;
	const height = width / AUTOPLAY_PILL_ASPECT;
	const railYFrac = layout.isPortrait
		? PORTRAIT_FS_COUNTER_CENTER_Y_FRAC
		: Math.max(PORTRAIT_FS_COUNTER_CENTER_Y_FRAC, 0.06);
	// Phone: FS plaque on the left of each desk; landscape keeps it on the right.
	const offsetXFrac = layout.isPortrait
		? -PORTRAIT_FS_COUNTER_OFFSET_X_FRAC
		: PORTRAIT_FS_COUNTER_OFFSET_X_FRAC;
	return {
		left: center.x + layout.boardWidth * offsetXFrac,
		top: deskTop + layout.boardHeight * railYFrac,
		width,
		height,
		fontSize: height * 0.42,
	};
};

/** @deprecated Prefer getDuelSpinCounterBox. */
export const getDuelSpinCounterPos = (layout: DuelScreenLayout, side: 'cat' | 'dog') => {
	const box = getDuelSpinCounterBox(layout, side);
	return { left: box.left, top: box.top };
};

/**
 * Phone FS plaque (`autoplay.webp`) — sits on the top gold desk rail.
 * WIDTH_FRAC: plaque width as a fraction of desk slot width.
 * CENTER_Y_FRAC: plaque centre from desk top (0 = flush with top edge).
 * OFFSET_X_FRAC: shift from desk centre (+ = right).
 */
export const PORTRAIT_FS_COUNTER_WIDTH_FRAC = 0.18;
export const PORTRAIT_FS_COUNTER_CENTER_Y_FRAC = 0.09;
export const PORTRAIT_FS_COUNTER_OFFSET_X_FRAC = 0.28;

/**
 * Bonus normal / super FS plaque on phone — top desk rail,
 * sized to `autoplay.webp` (number only, no FREE SPINS label).
 */
export const getPortraitFsCounterScreenBox = (opts: {
	mainLayout: MainLayoutLike;
	boardLayout: BoardLayoutLike;
}) => {
	const ml = opts.mainLayout;
	const board = opts.boardLayout;
	const visualW = board.visualWidth ?? board.width * board.scale;
	const visualH = board.visualHeight ?? board.height * board.scale;
	const boardCenterX = ml.x + (board.x - ml.width * 0.5) * ml.scale;
	const boardCenterY = ml.y + (board.y - ml.height * 0.5) * ml.scale;
	const slotW = (visualW * ml.scale) / DESK_PARCHMENT.widthFrac;
	const slotH = (visualH * ml.scale) / DESK_PARCHMENT.heightFrac;
	const deskCenterX = boardCenterX - DESK_PARCHMENT.offsetXFrac * slotW;
	const deskTop = boardCenterY - DESK_PARCHMENT.offsetYFrac * slotH - slotH * 0.5;
	const width = slotW * PORTRAIT_FS_COUNTER_WIDTH_FRAC;
	const height = width / AUTOPLAY_PILL_ASPECT;
	return {
		left: deskCenterX + slotW * PORTRAIT_FS_COUNTER_OFFSET_X_FRAC,
		top: deskTop + slotH * PORTRAIT_FS_COUNTER_CENTER_Y_FRAC,
		width,
		height,
		fontSize: height * 0.42,
	};
};

/** @deprecated Prefer getPortraitFsCounterScreenBox — kept for call-site migration. */
export const getPortraitFsCounterScreenPos = getPortraitFsCounterScreenBox;

/** Screen box for the cat mascot to the right of the cat board (desktop). */
export const getDuelCatMascotBox = (layout: DuelScreenLayout) => {
	const { w, h } = duelMascotSize(layout);
	const gap = layout.boardWidth * DUEL_MASCOT_GAP_FRAC;
	const overhang = w * layout.mascotOverhang;
	const left = layout.catCenter.x + layout.boardWidth * 0.5 + gap - overhang;
	const top = layout.catCenter.y + layout.boardHeight * 0.18 - h * 0.5;
	return {
		left,
		top,
		width: w,
		height: h,
		bodyLeft: left + overhang,
		bodyWidth: w - overhang,
	};
};

/** Screen box for the dog mascot left of the dog board (desktop). */
export const getDuelDogMascotBox = (layout: DuelScreenLayout) => {
	const base = duelMascotSize(layout);
	const scale = layout.isPortrait ? 1 : DUEL_DOG_MASCOT_SCALE;
	const w = base.w * scale;
	const h = base.h * scale;
	const gap = layout.boardWidth * DUEL_MASCOT_GAP_FRAC;
	const overhang = w * layout.mascotOverhang;
	const leftNudge = layout.isPortrait ? 0 : layout.boardWidth * DUEL_DOG_LEFT_NUDGE_FRAC;
	const left = layout.dogCenter.x - layout.boardWidth * 0.5 - gap - (w - overhang) - leftNudge;
	const top = layout.dogCenter.y + layout.boardHeight * 0.18 - h * 0.5;
	return {
		left,
		top,
		width: w,
		height: h,
		bodyLeft: left,
		bodyWidth: w - overhang,
	};
};

/**
 * Pixi boardLayout override so the shared reel board sits on a duel desk center
 * at the duel desk scale (mainLayout-local coords, same as normal boardLayout).
 */
export const getDuelPixiBoardLayout = (opts: {
	duel: DuelScreenLayout;
	side: 'cat' | 'dog';
	mainLayout: MainLayoutLike;
	base: BoardLayoutLike & {
		anchor: { x: number; y: number };
		pivot: { x: number; y: number };
		visualWidth: number;
		visualHeight: number;
	};
}) => {
	const center = opts.side === 'cat' ? opts.duel.catCenter : opts.duel.dogCenter;
	const deskLocalW = (opts.base.width * DESK_PARCHMENT_PADDING.width) / DESK_PARCHMENT.widthFrac;
	const scale = opts.duel.boardWidth / (deskLocalW * Math.max(1e-6, opts.mainLayout.scale));
	return {
		...opts.base,
		x: (center.x - opts.mainLayout.x) / opts.mainLayout.scale + opts.mainLayout.width * 0.5,
		y: (center.y - opts.mainLayout.y) / opts.mainLayout.scale + opts.mainLayout.height * 0.5,
		scale,
		visualWidth: opts.base.width * scale,
		visualHeight: opts.base.height * scale,
	};
};

/** @deprecated kept for any leftover callers — prefer normalDeskScreenSize via compute. */
export const duelNormalDeskApproxWidth = () =>
	(BOARD_SIZES.width * DESK_PARCHMENT_PADDING.width) / DESK_PARCHMENT.widthFrac;
