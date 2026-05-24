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

/**
 * Reel timing — padding distance must match scroll (see utils-slots
 * getMainSpinTargetY). Spin/pre-spin/slide-before-bounce speeds are kept
 * equal so there's no acceleration discontinuity during the main slide.
 *
 * Landing combines a Y-axis inertial drop on the reel with a Y-axis
 * vertical squash on each symbol — done by `removePaddingAndBounceBack`
 * in `createReelForSpinning.svelte.ts`:
 *
 *   1. Reel snaps to `defaultY + bounceSize` (initial overshoot below
 *      final position) — this is the "drop landed past the target".
 *   2. All symbols snap to scaleY = `reelLandSquashY` (vertical squash on
 *      impact) and ease back to scaleY = 1 over `reelLandSquashRecoveryMs`.
 *   3. Reel eases UP past `defaultY` to `−bounceSize × reelSettleSecondaryMulti`
 *      (secondary rebound — the visible inertia kick).
 *   4. Reel eases DOWN back to `defaultY` at `reelBounceBackSpeed ×
 *      reelSettleSecondarySpeedMulti` (final settle, sineOut for smoothness).
 *
 * Knobs:
 *   - `reelBounceSizeMulti`: initial overshoot as fraction of symbol
 *     height (bigger = stronger "drop").
 *   - `reelBounceBackSpeed`: speed of stage 2 (smaller = weightier).
 *   - `reelSettleSecondaryMulti`: rebound size as fraction of initial
 *     overshoot (0 = legacy single-ease behavior).
 *   - `reelSettleSecondarySpeedMulti`: speed multiplier for stage 3
 *     (smaller = slower & smoother final settle).
 *   - `reelLandSquashY`: vertical scale at impact (1 = no squash, 0.68
 *     = compress to 68% height — strong jelly hit).
 *   - `reelLandSquashRecoveryMs`: how long the unsquash takes
 *     (smaller = snappier rebound, bigger = softer recovery).
 *   - `reelLandSquashStretchMulti`: jelly factor — how much the symbol
 *     stretches horizontally as it squashes vertically (0 = no stretch,
 *     0.5 = subtle jelly, 1.0 = true area preservation). Synchronised
 *     automatically with the squash Tween.
 *
 * Same options are used in base game and free spins (spinOptions are
 * picked by `spinType` only, never by `gameType`, see stateGame.svelte.ts).
 */
const REEL_SPEED = 1.5;
const REEL_SETTLE_SPEED = REEL_SPEED * 0.42;
const SPIN_OPTIONS_SHARED = {
	reelBounceBackSpeed: REEL_SETTLE_SPEED,
	reelSpinSpeedBeforeBounce: REEL_SPEED,
	reelPaddingMultiplierNormal: 1.2,
	reelPaddingMultiplierAnticipated: 10,
	reelSpinDelay: 100,
	reelPreSpinSpeed: REEL_SPEED,
	reelSpinSpeed: REEL_SPEED,
	reelBounceSizeMulti: 0.28,
	reelSettleSecondaryMulti: 0.4,
	reelSettleSecondarySpeedMulti: 1.2,
	reelLandSquashY: 0.68,
	reelLandSquashRecoveryMs: 260,
	reelLandSquashStretchMulti: 0.55,
};

export const SPIN_OPTIONS_DEFAULT = { ...SPIN_OPTIONS_SHARED };

/** Turbo mode keeps the same spin speed (request: "одинаковая скорость")
 * but still short-circuits the pre-spin hold via `stateBet.isTurbo` in
 * `generalSpinWith`, so turbo still snaps to result faster. */
export const SPIN_OPTIONS_FAST = { ...SPIN_OPTIONS_SHARED };

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
/**
 * Per-layout board center offsets (game design-space px, +x right, −y up).
 * Each value shifts the reel block so it is visually centred inside the
 * playfield area that remains after subtracting the UI control bar for that
 * layout type.
 *
 * Desktop  (1422×800 game space):  UI bar ~140 px → game-area centre ≈ y 346 → offset -54
 * Tablet   (1000×1000):            UI bar ~86 px  → game-area centre ≈ y 457 → offset -43
 * Landscape(1600×900  mobile):     UI bar ~75 px  → game-area centre ≈ y 158 → offset -85
 * Portrait (800×1422):             drawer ~144 px → game-area centre ≈ y 350 → offset -150
 */
export const BOARD_LAYOUT_OFFSETS = {
	desktop: { x: 0, y: -55 },
	tablet: { x: 0, y: -45 },
	landscape: { x: 0, y: -85 },
	portrait: { x: 0, y: -150 },
} as const;
/** Frame bezel + glow offset from board center (px): +x right, +y down. */
export const BOARD_FRAME_OFFSET = { x: 6, y: 8 } as const;

const explosion = {
	type: 'spine',
	assetKey: 'explosion',
	animationName: 'explosion',
	sizeRatios: { width: 1, height: 1 },
};

// Symbol-level squash spine (`symbolsBounce/*.json`) is no longer used.
// Landing animation is now a pure Y-axis inertial drop done at the reel
// level (`removePaddingAndBounceBack` in createReelForSpinning); each
// symbol stays as its static sprite from spin → land → static, so its
// width/height never changes. See `BOUNCE_REDESIGN_PLAN.md`.

const h1Static = { type: 'sprite', assetKey: 'h1.webp', sizeRatios: { width: 1, height: 1 } };
const h2Static = { type: 'sprite', assetKey: 'h2.webp', sizeRatios: { width: 1, height: 1 } };
const h3Static = { type: 'sprite', assetKey: 'h3.webp', sizeRatios: { width: 1, height: 1 } };
const h4Static = { type: 'sprite', assetKey: 'h4.webp', sizeRatios: { width: 1, height: 1 } };

const l1Static = { type: 'sprite', assetKey: 'l1.webp', sizeRatios: { width: 1, height: 1 } };
const l2Static = { type: 'sprite', assetKey: 'l2.webp', sizeRatios: { width: 1, height: 1 } };
const l3Static = { type: 'sprite', assetKey: 'l3.webp', sizeRatios: { width: 1, height: 1 } };
const l4Static = { type: 'sprite', assetKey: 'l4.webp', sizeRatios: { width: 1, height: 1 } };

/**
 * Per-symbol win animation — used for any symbol whose `win` entry is
 * a sprite (H1..H4, L1..L4, B, M). The spine-based `W` win plays its
 * own `wild_dynamite` animation and skips this bounce.
 *
 * Flow (ReelSymbol.svelte): on `state === 'win'`
 *   1. UP: scale 1 → `scalePeak`, y-offset 0 → `−yOffsetPeakPx` over `upMs` (sineOut)
 *   2. HOLD `holdMs`
 *   3. DOWN: scale → 1, y-offset → 0 over `downMs` (sineIn)
 *   4. Fire `reelSymbol.oncomplete()` → Board moves the symbol to `postWinStatic`.
 *
 * Both axes scale uniformly (X = Y), so the symbol grows without
 * deformation, in contrast to the landing squash which is jelly-like.
 */
export const WIN_BOUNCE = {
	scalePeak: 1.18,
	yOffsetPeakPx: 18,
	upMs: 220,
	holdMs: 80,
	downMs: 280,
};

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

/** Pause after reels finish landing, before paylines/win animation start. */
export const WIN_INFO_PRE_DELAY_MS = 100;

/** Shared M spine clip when multiple mystery columns reveal at once. */
export const MYSTERY_REVEAL_SYNC_ANIMATION = 'mid_multiplier_pay';

const bStatic = { type: 'sprite', assetKey: 's.png', sizeRatios: { width: 1, height: 1 } };
const mStatic = { type: 'sprite', assetKey: 'm.png', sizeRatios: { width: 1, height: 1 } };

const wStatic = { type: 'sprite', assetKey: 'w.png', sizeRatios: { width: 1, height: 1 } };
const wSizeRatios = { width: 1.5 * 0.9, height: SPECIAL_SYMBOL_SIZE * 1.15 };

export const SYMBOL_INFO_MAP = {
	// H1..H4, L1..L4: same static sprite for spin / land / win / postWin.
	// On win the icon is animated by a per-symbol Tween in ReelSymbol
	// (grow + jump up — see WIN_BOUNCE below). The dedicated win spines
	// (`symbols/h1.json`, `l1.json` etc.) are no longer used for these
	// symbols. W keeps its win spine (`wild_dynamite`) because gameplay
	// hooks into the `wildExplode` spine event for sound.
	H1: {
		explosion,
		win: h1Static,
		postWinStatic: h1Static,
		static: h1Static,
		spin: h1Static,
		land: h1Static,
	},
	H2: {
		explosion,
		win: h2Static,
		postWinStatic: h2Static,
		static: h2Static,
		spin: h2Static,
		land: h2Static,
	},
	H3: {
		explosion,
		win: h3Static,
		postWinStatic: h3Static,
		static: h3Static,
		spin: h3Static,
		land: h3Static,
	},
	H4: {
		explosion,
		win: h4Static,
		postWinStatic: h4Static,
		static: h4Static,
		spin: h4Static,
		land: h4Static,
	},
	L1: {
		explosion,
		win: l1Static,
		postWinStatic: l1Static,
		static: l1Static,
		spin: l1Static,
		land: l1Static,
	},
	L2: {
		explosion,
		win: l2Static,
		postWinStatic: l2Static,
		static: l2Static,
		spin: l2Static,
		land: l2Static,
	},
	L3: {
		explosion,
		win: l3Static,
		postWinStatic: l3Static,
		static: l3Static,
		spin: l3Static,
		land: l3Static,
	},
	L4: {
		explosion,
		win: l4Static,
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
