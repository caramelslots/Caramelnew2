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
 * Geometry of the parchment playfield inside the desk artwork
 * (`boardDay` / `boardNight`, 1920×940). Measured from the day variant —
 * night uses the same composition. Values are fractions of the source image.
 *
 *   PARCH_*_FRAC     — parchment bbox size as a fraction of image size.
 *   PARCH_OFFSET_*   — parchment-center offset from image-center
 *                      (positive = right / down).
 *
 * Used by `BoardFrame.svelte` to scale the desk image so the parchment
 * wraps the 5×5 board, and to position it so the parchment center coincides
 * with the board-frame center.
 */
export const DESK_PARCHMENT = {
	widthFrac: 0.3042,
	heightFrac: 0.5277,
	offsetXFrac: 0.0078,
	offsetYFrac: 0.0819,
} as const;

/**
 * Padding around the 5×5 board for the parchment area (the playable cream
 * region inside the neon border). 1.0 = parchment exactly matches the board;
 * >1.0 leaves a margin around the symbols. Independent X/Y so the parchment
 * (which is wider than tall) can grow asymmetrically.
 */
export const DESK_PARCHMENT_PADDING = { width: 1.04, height: 1.04 } as const;
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
	desktop: { x: 0, y: 5 },
	tablet: { x: 0, y: 15 },
	landscape: { x: 0, y: -25 },
	portrait: { x: 0, y: -90 },
} as const;
/** Frame bezel + glow offset from board center (px): +x right, +y down. */
export const BOARD_FRAME_OFFSET = { x: 6, y: 8 } as const;

const explosion = {
	type: 'spine',
	assetKey: 'explosion',
	animationName: 'explosion',
	sizeRatios: { width: 1, height: 1 },
};

// New designer artwork comes from `designer_assets/Symbols/export/` — a
// single combined spine with bounce/win/explosion animations + per-symbol
// images. Static frames render as plain sprites (`*Img` assets in
// `assets.ts`) so spin → land → static stays cheap; only `land`/`win`/
// `mysteryReveal` instantiate the spine. The reel-level inertial squash
// (`removePaddingAndBounceBack` in createReelForSpinning) is preserved on
// top of the per-symbol bounce — they stack visually on landing.

const h1Static = { type: 'sprite', assetKey: 'H1Img', sizeRatios: { width: 1, height: 1 } };
const h2Static = { type: 'sprite', assetKey: 'H2Img', sizeRatios: { width: 1, height: 1 } };
const h3Static = { type: 'sprite', assetKey: 'H3Img', sizeRatios: { width: 1, height: 1 } };
const h4Static = { type: 'sprite', assetKey: 'H4Img', sizeRatios: { width: 1, height: 1 } };

const l1Static = { type: 'sprite', assetKey: 'L1Img', sizeRatios: { width: 1, height: 1 } };
const l2Static = { type: 'sprite', assetKey: 'L2Img', sizeRatios: { width: 1, height: 1 } };
const l3Static = { type: 'sprite', assetKey: 'L3Img', sizeRatios: { width: 1, height: 1 } };
const l4Static = { type: 'sprite', assetKey: 'L4Img', sizeRatios: { width: 1, height: 1 } };

// Per-symbol bounce on landing — slot-driven attachment matches the
// asset key, so each spine animates only the H_/L_ image we want.
const bounceSizeRatios = { width: 1, height: 1 };
const h1Bounce = {
	type: 'spine',
	assetKey: 'H1',
	animationName: 'High_1/bounce',
	sizeRatios: bounceSizeRatios,
};
const h2Bounce = {
	type: 'spine',
	assetKey: 'H2',
	animationName: 'High_2/bounce',
	sizeRatios: bounceSizeRatios,
};
const h3Bounce = {
	type: 'spine',
	assetKey: 'H3',
	animationName: 'High_3/bounce',
	sizeRatios: bounceSizeRatios,
};
const h4Bounce = {
	type: 'spine',
	assetKey: 'H4',
	animationName: 'High_4/bounce',
	sizeRatios: bounceSizeRatios,
};
const l1Bounce = {
	type: 'spine',
	assetKey: 'L1',
	animationName: 'Low_1/bounce',
	sizeRatios: bounceSizeRatios,
};
const l2Bounce = {
	type: 'spine',
	assetKey: 'L2',
	animationName: 'Low_2/bounce',
	sizeRatios: bounceSizeRatios,
};
const l3Bounce = {
	type: 'spine',
	assetKey: 'L3',
	animationName: 'Low_3/bounce',
	sizeRatios: bounceSizeRatios,
};
const l4Bounce = {
	type: 'spine',
	assetKey: 'L4',
	animationName: 'Low_4/bounce',
	sizeRatios: bounceSizeRatios,
};

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

/**
 * Затемнение невыигрышных символов во время win-анимации.
 * Пока проигрываются paylines / scatter highlight / bonus collect,
 * все символы вне состояния `win`/`postWinStatic` получают пониженный
 * alpha на уровне родительского Container — игроку проще считать,
 * какие позиции «сыграли».
 *
 * Управляется флагом `stateGame.winSpotlightActive` (см. stateGame.svelte.ts),
 * который поднимается хелпером `animateSymbols` в bookEventHandlerMap.ts
 * и сбрасывается при старте следующего спина (`reveal` handler).
 */
export const DIM_NON_WINNING = {
	alpha: 0.35,
	fadeInMs: 180,
	fadeOutMs: 240,
};

/** Mystery reveal spine size — `Mystery/explosion` from designer combined
 * skeleton renders aura + sign + flying parts; container scales the whole
 * thing relative to SYMBOL_SIZE. 1.0 keeps the explosion within one cell. */
export const M_SIZE = 1.0;

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

/**
 * Pause between reels finishing landing and mystery reveal animation
 * starting. Without it, M-cells on the last-stopping reel transition
 * into the reveal spine in the same tick they enter `land` state, so
 * the static `?` sprite is invisible to the player. Mirrors the same
 * idea as `WIN_INFO_PRE_DELAY_MS` for paylines.
 */
export const MYSTERY_REVEAL_PRE_DELAY_MS = 400;

/** Pause after mystery cells finish reveal, before winInfo / next reveal spin. */
export const MYSTERY_REVEAL_POST_DELAY_MS = 1000;

/** Pause after reels finish landing, before paylines/win animation start. */
export const WIN_INFO_PRE_DELAY_MS = 100;

/** Shared Mystery spine clip — designer combined skeleton has a single
 * explosion track for all reveal types, so synced and independent reveals
 * use the same animation name. */
export const MYSTERY_REVEAL_SYNC_ANIMATION = 'Mystery/explosion';
/** Standalone clip name for one-off reveals (kept distinct so it could be
 * pointed at a different animation later without touching the sync path). */
export const MYSTERY_REVEAL_ANIMATION = 'Mystery/explosion';

// Bonus rest pose — the kitty's paw lives in a *separate* atlas region
// from the body in the spine (`Paw` slot vs `Special_1` slot), positioned
// via the `Paw` bone. The legacy static PNG (`Special_1.png`) bakes both
// together at slightly different coordinates, so swapping sprite ⇄ spine
// caused the paw to "jump" / disappear at every state transition. We
// instead render the same spine in every state and play a synthesised
// zero-movement `Special_1/idle` clip for static/spin/postWinStatic, so
// the paw is always pinned at the spine's rest position.
const bStatic = {
	type: 'spine' as const,
	assetKey: 'B' as const,
	animationName: 'Special_1/idle',
	sizeRatios: { width: 1, height: 1 },
};
const mStatic = { type: 'sprite', assetKey: 'MImg', sizeRatios: { width: 1, height: 1 } };

const wStatic = { type: 'sprite', assetKey: 'WImg', sizeRatios: { width: 1, height: 1 } };
const wWinSizeRatios = { width: SPECIAL_SYMBOL_SIZE, height: SPECIAL_SYMBOL_SIZE };
const bWinSizeRatios = { width: SPECIAL_SYMBOL_SIZE, height: SPECIAL_SYMBOL_SIZE };
const mRevealSizeRatios = { width: M_SIZE, height: M_SIZE };

// Win celebrations use the dedicated `*Win` skeletons so the win track's
// rgba timelines drive the text letters; landing/idle uses the slim
// skeletons (no text slots) so default-skin attachments never leak.
const wWin = {
	type: 'spine' as const,
	assetKey: 'WWin' as const,
	animationName: 'Special_2/win',
	sizeRatios: wWinSizeRatios,
};
const wBounce = {
	type: 'spine' as const,
	assetKey: 'W' as const,
	animationName: 'Special_2/bounce',
	sizeRatios: bounceSizeRatios,
};
// Bonus landing plays the paw `wave` (parent bone idle) — the cat actually
// flexes its paw + ears + whiskers on impact instead of just the parent
// scale squash from `Special_1/bounce`. The reel-level Y-axis squash
// already provides the impact bounce, so a flat `wave` reads as "kitty
// settled and waved hello", which matches the designer's reference.
const bBounce = {
	type: 'spine' as const,
	assetKey: 'B' as const,
	animationName: 'Special_1/wave',
	sizeRatios: bounceSizeRatios,
};
const bWin = {
	type: 'spine' as const,
	assetKey: 'BWin' as const,
	animationName: 'Special_1/win',
	sizeRatios: bWinSizeRatios,
};

export const SYMBOL_INFO_MAP = {
	// H1..H4, L1..L4: render as the new static PNG everywhere except
	// `land` — landing plays the per-symbol designer bounce spine
	// (`High_x/bounce` or `Low_x/bounce`). Win celebration also reuses the
	// bounce spine so the symbol springs again when it scores; this keeps
	// the visual consistent with WIN_BOUNCE's translate Tween that
	// ReelSymbol still applies on top.
	H1: {
		explosion,
		win: h1Static,
		postWinStatic: h1Static,
		static: h1Static,
		spin: h1Static,
		land: h1Bounce,
	},
	H2: {
		explosion,
		win: h2Static,
		postWinStatic: h2Static,
		static: h2Static,
		spin: h2Static,
		land: h2Bounce,
	},
	H3: {
		explosion,
		win: h3Static,
		postWinStatic: h3Static,
		static: h3Static,
		spin: h3Static,
		land: h3Bounce,
	},
	H4: {
		explosion,
		win: h4Static,
		postWinStatic: h4Static,
		static: h4Static,
		spin: h4Static,
		land: h4Bounce,
	},
	L1: {
		explosion,
		win: l1Static,
		postWinStatic: l1Static,
		static: l1Static,
		spin: l1Static,
		land: l1Bounce,
	},
	L2: {
		explosion,
		win: l2Static,
		postWinStatic: l2Static,
		static: l2Static,
		spin: l2Static,
		land: l2Bounce,
	},
	L3: {
		explosion,
		win: l3Static,
		postWinStatic: l3Static,
		static: l3Static,
		spin: l3Static,
		land: l3Bounce,
	},
	L4: {
		explosion,
		win: l4Static,
		postWinStatic: l4Static,
		static: l4Static,
		spin: l4Static,
		land: l4Bounce,
	},
	// Wild — bounce spine on land, dedicated `Special_2/win` celebration
	// spine on win (lights up the W/I/L/D letters). Static frames keep the
	// new `WImg` PNG so spinning is cheap.
	W: {
		explosion,
		postWinStatic: wStatic,
		static: wStatic,
		spin: wStatic,
		win: wWin,
		land: wBounce,
	},
	// Bonus — same pattern as Wild but with `Special_1/win` (lights up
	// B/O/N/U/S letters with paw mascot wave).
	B: {
		explosion,
		postWinStatic: bStatic,
		static: bStatic,
		spin: bStatic,
		win: bWin,
		land: bBounce,
	},
	// Mystery — `?` sign sprite while waiting for reveal; designer
	// `Mystery/explosion` spine plays during `mysteryReveal` (handled
	// dynamically in `getMysteryRevealSymbolInfo`).
	M: {
		explosion,
		postWinStatic: mStatic,
		static: mStatic,
		spin: mStatic,
		win: mStatic,
		land: mStatic,
	},
} as const;

/** Mystery reveal spine descriptor — exposed so `getSymbolInfo` can
 * splice it into the M cell when state flips to `mysteryReveal`. The
 * designer-handoff explosion is tier-agnostic (same animation regardless
 * of revealed symbol), so we no longer key by `MYSTERY_REVEAL_TIER`. */
export const MYSTERY_REVEAL_SPINE = {
	type: 'spine' as const,
	assetKey: 'M' as const,
	animationName: MYSTERY_REVEAL_ANIMATION,
	sizeRatios: mRevealSizeRatios,
};

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;
