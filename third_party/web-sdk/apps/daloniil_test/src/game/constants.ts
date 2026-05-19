import _ from 'lodash';

import type { RawSymbol, SymbolState } from './types';

export const SYMBOL_SIZE = 100;

export const REEL_PADDING = 0.53;

// Cash Stacks: 5 reels × 5 rows, padded top and bottom (7 cells per column).
// Order: [top_padding, row0..row4, bottom_padding]
export const INITIAL_BOARD: RawSymbol[][] = [
	[
		{ name: 'L2' },
		{ name: 'L1' },
		{ name: 'L4' },
		{ name: 'H2' },
		{ name: 'L1' },
		{ name: 'L3' },
		{ name: 'H4' },
	],
	[
		{ name: 'H1' },
		{ name: 'L4' },
		{ name: 'L2' },
		{ name: 'H3' },
		{ name: 'L4' },
		{ name: 'L1' },
		{ name: 'B' },
	],
	[
		{ name: 'L3' },
		{ name: 'L1' },
		{ name: 'L3' },
		{ name: 'H4' },
		{ name: 'L4' },
		{ name: 'L2' },
		{ name: 'H2' },
	],
	[
		{ name: 'H4' },
		{ name: 'H3' },
		{ name: 'L4' },
		{ name: 'L2' },
		{ name: 'L1' },
		{ name: 'L3' },
		{ name: 'H1' },
	],
	[
		{ name: 'H3' },
		{ name: 'L3' },
		{ name: 'L4' },
		{ name: 'H1' },
		{ name: 'H1' },
		{ name: 'L2' },
		{ name: 'L1' },
	],
];

export const BOARD_DIMENSIONS = { x: INITIAL_BOARD.length, y: INITIAL_BOARD[0].length - 2 };

export const BOARD_SIZES = {
	width: SYMBOL_SIZE * BOARD_DIMENSIONS.x,
	height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
};

export const BACKGROUND_RATIO = 2039 / 1000;
export const PORTRAIT_BACKGROUND_RATIO = 1242 / 2208;
const PORTRAIT_RATIO = 800 / 1422;
const LANDSCAPE_RATIO = 1600 / 900;
const DESKTOP_RATIO = 1422 / 800;

const DESKTOP_HEIGHT = 800;
const LANDSCAPE_HEIGHT = 900;
const PORTRAIT_HEIGHT = 1422;
export const DESKTOP_MAIN_SIZES = { width: DESKTOP_HEIGHT * DESKTOP_RATIO, height: DESKTOP_HEIGHT };
export const LANDSCAPE_MAIN_SIZES = {
	width: LANDSCAPE_HEIGHT * LANDSCAPE_RATIO,
	height: LANDSCAPE_HEIGHT,
};
export const PORTRAIT_MAIN_SIZES = {
	width: PORTRAIT_HEIGHT * PORTRAIT_RATIO,
	height: PORTRAIT_HEIGHT,
};

export const HIGH_SYMBOLS = ['H1', 'H2', 'H3', 'H4'];

export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

const HIGH_SYMBOL_SIZE = 0.9;
const LOW_SYMBOL_SIZE = 0.9;
const SPECIAL_SYMBOL_SIZE = 1;

/** Main stop travel (symbols). All reels use `reelSpinRotations` in stateGame. */
export const REEL_SPIN_ROTATIONS = 2;
const SPIN_OPTIONS_SHARED = {
	reelBounceBackSpeed: 0.12,
	reelSpinSpeedBeforeBounce: 2.4,
	reelPaddingMultiplierNormal: REEL_SPIN_ROTATIONS / 7,
	reelPaddingMultiplierAnticipated: 3 / 7,
	reelSpinDelay: 100,
};

export const SPIN_OPTIONS_DEFAULT = {
	...SPIN_OPTIONS_SHARED,
	reelPreSpinSpeed: 1.6,
	reelSpinSpeed: 1.8,
	reelBounceSizeMulti: 0.22,
};

export const SPIN_OPTIONS_FAST = {
	...SPIN_OPTIONS_SHARED,
	reelPreSpinSpeed: 3.2,
	reelSpinSpeed: 4,
	reelBounceSizeMulti: 0.06,
};

export const MOTION_BLUR_VELOCITY = 31;

export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
};

/** Purple FS pulse (`reelhouse_glow` in BoardFrame) — separate from frame bezel padding. */
export const REELHOUSE_GLOW_SCALE = { width: 0.62, height: 0.66 } as const;
/** Whole slot block offset from screen center (px): +x right, −y up. */
export const BOARD_LAYOUT_OFFSET = { x: 0, y: -20 } as const;
/** Frame bezel + glow offset from board center (px): +x right, +y down. */
export const BOARD_FRAME_OFFSET = { x: 6, y: 8 } as const;

const explosion = {
	type: 'spine',
	assetKey: 'explosion',
	animationName: 'explosion',
	sizeRatios: { width: 1, height: 1 },
};

const h1Static = { type: 'sprite', assetKey: 'h1.webp', sizeRatios: { width: 1, height: 1 } };
const h2Static = { type: 'sprite', assetKey: 'h2.webp', sizeRatios: { width: 1, height: 1 } };
const h3Static = { type: 'sprite', assetKey: 'h3.webp', sizeRatios: { width: 1, height: 1 } };
const h4Static = { type: 'sprite', assetKey: 'h4.webp', sizeRatios: { width: 1, height: 1 } };

const l1Static = { type: 'sprite', assetKey: 'l1.webp', sizeRatios: { width: 1, height: 1 } };
const l2Static = { type: 'sprite', assetKey: 'l2.webp', sizeRatios: { width: 1, height: 1 } };
const l3Static = { type: 'sprite', assetKey: 'l3.webp', sizeRatios: { width: 1, height: 1 } };
const l4Static = { type: 'sprite', assetKey: 'l4.webp', sizeRatios: { width: 1, height: 1 } };

/** M spine pay-tier during `mysteryReveal` (symbols2/M.json). */
export const M_SIZE = 0.35;

export const MYSTERY_REVEAL_TIER: Record<string, 'high' | 'mid' | 'low'> = {
	H1: 'high',
	H2: 'high',
	H3: 'high',
	H4: 'high',
	W: 'high',
	L1: 'low',
	L2: 'low',
	L3: 'low',
	L4: 'low',
};

/** Pause after mystery cells finish reveal, before winInfo / next reveal spin. */
export const MYSTERY_REVEAL_POST_DELAY_MS = 1000;

/** Shared M spine clip when multiple mystery columns reveal at once. */
export const MYSTERY_REVEAL_SYNC_ANIMATION = 'mid_multiplier_pay';

const bStatic = { type: 'sprite', assetKey: 's.png', sizeRatios: { width: 1, height: 1 } };
const mStatic = { type: 'sprite', assetKey: 'm.png', sizeRatios: { width: 1, height: 1 } };

const wStatic = { type: 'sprite', assetKey: 'w.png', sizeRatios: { width: 1, height: 1 } };
const wSizeRatios = { width: 1.5 * 0.9, height: SPECIAL_SYMBOL_SIZE * 1.15 };

export const SYMBOL_INFO_MAP = {
	H1: {
		explosion,
		win: {
			type: 'spine',
			assetKey: 'H1',
			animationName: 'h1',
			sizeRatios: { width: 0.5 * 1.15, height: HIGH_SYMBOL_SIZE * 0.57 },
		},
		postWinStatic: h1Static,
		static: h1Static,
		spin: h1Static,
		land: h1Static,
	},
	H2: {
		explosion,
		win: {
			type: 'spine',
			assetKey: 'H2',
			animationName: 'h2',
			sizeRatios: { width: 0.5, height: HIGH_SYMBOL_SIZE * 0.57 },
		},
		postWinStatic: h2Static,
		static: h2Static,
		spin: h2Static,
		land: h2Static,
	},
	H3: {
		explosion,
		win: {
			type: 'spine',
			assetKey: 'H3',
			animationName: 'h3',
			sizeRatios: { width: 0.5 * 0.9, height: HIGH_SYMBOL_SIZE * 0.53 },
		},
		postWinStatic: h3Static,
		static: h3Static,
		spin: h3Static,
		land: h3Static,
	},
	H4: {
		explosion,
		win: {
			type: 'spine',
			assetKey: 'H4',
			animationName: 'h4',
			sizeRatios: { width: 0.5 * 0.9, height: HIGH_SYMBOL_SIZE * 0.53 },
		},
		postWinStatic: h4Static,
		static: h4Static,
		spin: h4Static,
		land: h4Static,
	},
	L1: {
		explosion,
		win: {
			type: 'spine',
			assetKey: 'L1',
			animationName: 'l1',
			sizeRatios: { width: 0.5 * 0.75, height: LOW_SYMBOL_SIZE * 0.65 },
		},
		postWinStatic: l1Static,
		static: l1Static,
		spin: l1Static,
		land: l1Static,
	},
	L2: {
		explosion,
		win: {
			type: 'spine',
			assetKey: 'L2',
			animationName: 'l2',
			sizeRatios: { width: 0.5 * 0.75, height: LOW_SYMBOL_SIZE * 0.65 },
		},
		postWinStatic: l2Static,
		static: l2Static,
		spin: l2Static,
		land: l2Static,
	},
	L3: {
		explosion,
		win: {
			type: 'spine',
			assetKey: 'L3',
			animationName: 'l3',
			sizeRatios: { width: 0.5 * 0.75, height: LOW_SYMBOL_SIZE * 0.63 },
		},
		postWinStatic: l3Static,
		static: l3Static,
		spin: l3Static,
		land: l3Static,
	},
	L4: {
		explosion,
		win: {
			type: 'spine',
			assetKey: 'L4',
			animationName: 'l4',
			sizeRatios: { width: 0.5 * 0.75, height: LOW_SYMBOL_SIZE * 0.63 },
		},
		postWinStatic: l4Static,
		static: l4Static,
		spin: l4Static,
		land: l4Static,
	},
	W: {
		explosion,
		postWinStatic: {
			type: 'sprite',
			assetKey: 'explodedW.png',
			sizeRatios: { width: 0.85, height: 0.85 },
		},
		static: wStatic,
		spin: wStatic,
		win: { type: 'spine', assetKey: 'W', animationName: 'wild_dynamite', sizeRatios: wSizeRatios },
		land: wStatic,
	},
	B: {
		explosion,
		postWinStatic: bStatic,
		static: bStatic,
		spin: bStatic,
		win: bStatic,
		land: bStatic,
	},
	M: {
		explosion,
		postWinStatic: mStatic,
		static: mStatic,
		spin: mStatic,
		win: mStatic,
		land: mStatic,
	},
} as const;

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;
