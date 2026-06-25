import _ from 'lodash';

import type { RawSymbol, SymbolState } from './types';

export const SYMBOL_SIZE = 100;

/** Native symbol PNG edge length (symbolsNew/*.png). */
export const SYMBOL_TEXTURE_NATIVE_PX = 196;

/** Cap mainLayout.scale so reel symbols are not upscaled past texture density. */
export const MAX_LAYOUT_SCALE = SYMBOL_TEXTURE_NATIVE_PX / SYMBOL_SIZE;

/** Bitmap font families (prostoi = default gold text, krutoi = big/super/epic win). */
export const FONT_PROSTOI = 'Reggae One Regular';
export const FONT_PROSTOI_WHITE = 'Reggae One White';
export const FONT_KRUTOI = 'Shojumaru';
/** Russian (Cyrillic) bitmap font variants. */
export const FONT_PROSTOI_RU = 'Philosopher Bold';
export const FONT_PROSTOI_WHITE_RU = 'Philosopher Bold White';
export const FONT_KRUTOI_RU = 'Russo One';
/** Hindi (Devanagari) bitmap font variants — krutoi reuses gold prostoi per art handoff. */
export const FONT_PROSTOI_HI = 'Noto Sans Devanagari Regular';
export const FONT_PROSTOI_WHITE_HI = 'Noto Sans Devanagari White';
export const FONT_KRUTOI_HI = FONT_PROSTOI_HI;
/** Vietnamese bitmap font variants — krutoi reuses gold prostoi per art handoff. */
export const FONT_PROSTOI_VI = 'Fruktur Regular';
export const FONT_PROSTOI_WHITE_VI = 'Fruktur Regular White';
export const FONT_KRUTOI_VI = FONT_PROSTOI_VI;
/** Bablo — full currency-glyph font (₽ € ₩ ₴ ₫ ₱ ₹ ₦ ₪ ₡ ¥ zł…). Used for all monetary amounts. */
export const FONT_BABLO = 'Noto Sans SemiCondensed SemiBold';

export type LocaleScript = 'latin' | 'cyrillic' | 'cjk' | 'arabic' | 'devanagari';

const CJK_LOCALES = new Set(['ja', 'ko', 'zh']);
const ARABIC_LOCALES = new Set(['ar']);
const DEVANAGARI_LOCALES = new Set(['hi']);

/** CJK (ja / ko / zh) bitmap font variants — krutoi reuses gold prostoi per art handoff. */
export const FONT_PROSTOI_CJK = 'Asian Y Standard';
export const FONT_PROSTOI_WHITE_CJK = 'Asian Y White';
export const FONT_KRUTOI_CJK = FONT_PROSTOI_CJK;
/** Arabic TTF fonts — prostoi / white share Medium; krutoi uses Black. */
export const FONT_ARABIC_PROSTOI = 'Cairo Medium';
export const FONT_ARABIC_KRUTOI = 'Cairo Black';

export const isCjkLocale = (locale: string): boolean => CJK_LOCALES.has(locale);
export const isArabicLocale = (locale: string): boolean => ARABIC_LOCALES.has(locale);

/** Classify locale script for font / layout decisions. */
export const localeScriptGroup = (locale: string): LocaleScript => {
	if (locale === 'ru') return 'cyrillic';
	if (CJK_LOCALES.has(locale)) return 'cjk';
	if (ARABIC_LOCALES.has(locale)) return 'arabic';
	if (DEVANAGARI_LOCALES.has(locale)) return 'devanagari';
	return 'latin';
};

/** Prostoi/krutoi bitmap atlases cover Latin, Cyrillic, Hindi, Vietnamese, and CJK. */
export const supportsBitmapFont = (locale: string): boolean => {
	if (locale === 'vi' || isCjkLocale(locale)) return true;
	const script = localeScriptGroup(locale);
	return script === 'latin' || script === 'cyrillic' || script === 'devanagari';
};

export const localeTextDirection = (locale: string): 'ltr' | 'rtl' =>
	locale === 'ar' ? 'rtl' : 'ltr';

/** System font stack for ar fallback (non-bitmap locale). */
export const SYSTEM_TEXT_FONT_FAMILY =
	"'proxima-nova', 'Noto Sans', 'Noto Sans Arabic', system-ui, sans-serif";

/** PIXI/HTML system font for locales without bitmap glyphs. */
export const systemTextFontFamily = (locale: string): string => {
	if (isArabicLocale(locale)) return FONT_ARABIC_PROSTOI;
	return SYSTEM_TEXT_FONT_FAMILY;
};

const isKrutoiBitmapFamily = (fontFamily: string): boolean =>
	fontFamily === FONT_KRUTOI ||
	fontFamily === FONT_KRUTOI_RU ||
	fontFamily === FONT_KRUTOI_HI ||
	fontFamily === FONT_KRUTOI_VI;

export const LOCALE_TEXT_FILL_GOLD = '#ffcc44';
export const LOCALE_TEXT_FILL_WHITE = '#ffffff';

/**
 * Pick the correct bitmap font for the current locale.
 * `hi` / `vi` / `cjk` — optional locale-specific variants; krutoi on hi/vi/cjk reuses gold prostoi.
 */
export const fontForLocale = (
	latin: string,
	ru: string,
	locale: string,
	hi?: string,
	vi?: string,
	cjk?: string,
): string => {
	if (locale === 'ru') return ru;
	if (locale === 'hi' && hi) return hi;
	if (locale === 'vi' && vi) return vi;
	if (isCjkLocale(locale) && cjk) return cjk;
	if (locale === 'ar') {
		return isKrutoiBitmapFamily(latin) ? FONT_ARABIC_KRUTOI : FONT_ARABIC_PROSTOI;
	}
	if (supportsBitmapFont(locale)) return latin;
	return latin;
};
/**
 * Pixi scales bitmap glyphs as `fontSize / font.info.size`.
 * Legacy gold used info size 105; prostoi/krutoi use 53 — same fontSize renders ~2× larger without this.
 */
export const BITMAP_FONT_SCALE = 65 / 105;

/** Prostoi bitmap size for WIN label under the board (ref px before BITMAP_FONT_SCALE). */
export const WIN_HUD_FONT_SIZE = 52;

/** Prostoi bitmap size for per-line small-win amounts (ref px before BITMAP_FONT_SCALE). */
export const PAYLINE_WIN_AMOUNT_FONT_SIZE = 42;
/** Vertical offset above the payline center (ref px). */
export const PAYLINE_WIN_AMOUNT_ABOVE_LINE_OFFSET = 36;

/** Prostoi white bitmap size for "Press to continue" (ref px before BITMAP_FONT_SCALE). */
export const PRESS_TO_CONTINUE_FONT_SIZE = 38;
/** Distance from bottom of main layout (ref px). */
export const PRESS_TO_CONTINUE_BOTTOM_OFFSET = 18;

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

/** Whether a settled reel-pool index is on the visible grid (not top/bottom padding). */
export const isVisibleBoardSymbolIndex = (
	symbolIndex: number,
	activeSymbolCount: number,
): boolean => {
	const visibleRows = BOARD_DIMENSIONS.y;
	if (activeSymbolCount > visibleRows) {
		// Padded layout: [top_pad, row0..rowN-1, bottom_pad] → indices 1..N.
		return symbolIndex >= 1 && symbolIndex <= visibleRows;
	}
	return symbolIndex >= 0 && symbolIndex < visibleRows;
};

export const BOARD_SIZES = {
	width: SYMBOL_SIZE * BOARD_DIMENSIONS.x - 10,
	height: SYMBOL_SIZE * BOARD_DIMENSIONS.y - 10,
};

/**
 * Trims the visible board area from specific edges (px).
 * right  — shrinks the right edge inward.
 * bottom — shrinks the bottom edge inward.
 * The board center shifts by half the trim to keep the opposite edge fixed.
 */
export const BOARD_SIZE_TRIM = { right: 0, bottom: 0 } as const;

/**
 * Per-symbol win animation — used when `win` shows a frozen idle spine
 * (H1..H4, L1..L4, M) with a container scale tween. W and B play dedicated
 * spine win clips (`Special_2/win`, `Special_1/wave`) and skip this bounce.
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
 * Extra mask coverage above the grid while win symbols bounce — see
 * BoardMask.svelte (`winSpotlightActive`).
 */
export const BOARD_MASK_WIN_BOUNCE_TOP =
	WIN_BOUNCE.yOffsetPeakPx + Math.ceil(((WIN_BOUNCE.scalePeak - 1) * SYMBOL_SIZE) / 2);

/**
 * Extra mask coverage (px) beyond the visible board grid so spinning symbols
 * slide *behind* the board edge instead of vanishing over the parchment
 * ("in the air"). top/bottom are measured from the grid edges outward.
 *
 * Idle values — keep tight so parked padding rows stay hidden (top pad
 * center ≈ y−50, bottom pad center ≈ y550).
 */
export const BOARD_MASK_OVERFLOW = { top: 0, bottom: 10 } as const;

/**
 * Bottom mask runway while reels scroll or bounce — see BoardMask.svelte
 * (`boardReelsActive`). Top stays at 0: any top overflow exposes the parked
 * padding row (center y−50). Parked padding is culled in ReelSymbol while
 * reels move; keep bottom modest so symbols do not bleed into the frame gap.
 */
export const BOARD_MASK_SPIN_OVERFLOW = { top: 0, bottom: 20 } as const;

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
 *
 * Target: ~2.5 s from Bet click to last reel stopped (instant RGS).
 * Tuned via REEL_SPEED + reelSpinDelay; pre-spin / main-spin / settle
 * speeds stay equal (or proportionally linked) so motion stays smooth.
 *
 * Speed ↔ duration coupling: the last reel's main slide takes roughly
 *   t ≈ (728 + 500 × B) / REEL_SPEED   (px/ms, B = reelLength × paddingMult),
 * so the symbols' visual speed and the total spin time are linked through
 * the scroll distance B. To make the spin *slower* (symbols travel at a
 * lower px/ms) WITHOUT dragging past ~2.5 s, we lower REEL_SPEED and shrink
 * the scroll distance (reelPaddingMultiplierNormal) by a matching amount.
 * Lowering only the speed would inflate the spin to ~3.4 s.
 *
 * Current tuning: REEL_SPEED 2.5 → 1.6 (≈36% slower symbols) with
 * paddingMult 1.2 → 0.7, which keeps the last reel's main slide at
 * ~1.97 s (≈2.5 s total incl. stagger + settle).
 */
const REEL_SPEED = 1.4;
const REEL_SETTLE_SPEED = REEL_SPEED * 0.62;
const SPIN_OPTIONS_SHARED = {
	reelBounceBackSpeed: REEL_SETTLE_SPEED,
	reelSpinSpeedBeforeBounce: REEL_SPEED,
	reelPaddingMultiplierNormal: 0.7,
	reelPaddingMultiplierAnticipated: 10,
	// Per-reel START stagger (ms × reelIndex) for the pre-spin launch. A small
	// 10ms gives a subtle left-to-right cascade at the start without the
	// "rushing to catch up" look that a larger delay produced at the slower
	// REEL_SPEED. The left-to-right STOP order is independent of this — it
	// comes from each reel's accumulated padding distance, so it stays.
	reelSpinDelay: 60,
	reelPreSpinSpeed: REEL_SPEED,
	reelSpinSpeed: REEL_SPEED,
	// Start at a constant speed (no `backIn` wind-up burst) so the slot doesn't
	// visibly "surge" to swap symbols at the start of the spin.
	reelPreSpinWindup: false,
	reelBounceSizeMulti: 0,
	reelSettleSecondaryMulti: 0,
	reelSettleSecondarySpeedMulti: 0,
	// Fixed total bounce-back time in ms (overrides REEL_SETTLE_SPEED for the
	// settle). Set the bounce duration directly here. The jelly squash runs in
	// parallel — match reelLandSquashRecoveryMs to it for one unified duration.
	reelSettleDurationMs: 0,
	// 1 = код-сквош выключен. Единственный источник сжатия на приземлении —
	// дизайнерский bounce-spine (SYMBOL_INFO_MAP.land = *Bounce). Так сжатие
	// происходит ровно один раз и не «дёргается» от наложения двух анимаций.
	reelLandSquashY: 1,
	reelLandSquashRecoveryMs: 110,
	reelLandSquashStretchMulti: 0.55,
};

export const SPIN_OPTIONS_DEFAULT = { ...SPIN_OPTIONS_SHARED };

/** Turbo mode keeps the same spin speed (request: "одинаковая скорость")
 * but still short-circuits the pre-spin hold via `stateBet.isTurbo` in
 * `generalSpinWith`, so turbo still snaps to result faster. */
export const SPIN_OPTIONS_FAST = { ...SPIN_OPTIONS_SHARED };

export const MOTION_BLUR_VELOCITY = 52;

export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
};

/** FS board pulse (`reelhouse_glow` in BoardFrame) — tint #db7ce0. */
export const REELHOUSE_GLOW_SCALE = { width: 0.58, height: 0.62 } as const;

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
	desktop: { x: 0, y: -4 },
	tablet: { x: 0, y: 7 },
	landscape: { x: 0, y: -35 },
	portrait: { x: -14, y: -222 },
} as const;
/** Frame bezel + glow offset from board center (px): +x right, +y down. */
export const BOARD_FRAME_OFFSET = { x: 6, y: 8 } as const;

/**
 * ProgressLadder `.bar-h` rendered width (px). Portrait desk parchment width
 * on screen is matched to this value (not the raw reel grid width).
 */
export const PORTRAIT_BONUS_BAR_WIDTH_PX = 340;
/** ProgressLadder `.bar-h` height (px), aspect ratio matches bar_h.png 657×217. */
export const PORTRAIT_BONUS_BAR_HEIGHT_PX = 112.3;

/** FS left counter width as a fraction of portrait board visual width. */
export const PORTRAIT_FS_COUNTER_WIDTH_FRAC = 0.55;
/** Extra shrink on phone portrait — panel width and bitmap text scale together. */
export const PORTRAIT_FS_COUNTER_PHONE_SCALE = {
	small: 0.87,
	medium: 0.93,
	large: 0.96,
} as const;
/** Vertical gap above spin cluster (game px at phone scale 1). */
export const PORTRAIT_FS_COUNTER_Y_GAP = 100;

/**
 * Portrait phone board scale (uniform — board + bonus bar scale together).
 * `smallMobile` ≤375px (iPhone SE), `mobile` ≤480px (iPhone 12/13/14, etc.).
 */
export const PORTRAIT_SMALL_MOBILE_SCALE = 0.72;
export const PORTRAIT_MOBILE_SCALE = 0.85;

export type PortraitCanvasSizeType =
	| 'smallMobile'
	| 'mobile'
	| 'tablet'
	| 'largeTablet'
	| 'desktop';

export const getPortraitSmallMobileScaleFactor = (canvasSizeType: PortraitCanvasSizeType) => {
	if (canvasSizeType === 'smallMobile') return PORTRAIT_SMALL_MOBILE_SCALE;
	if (canvasSizeType === 'mobile') return PORTRAIT_MOBILE_SCALE;
	return 1;
};

/** Portrait width tiers (px) for buy panel text. */
export const PORTRAIT_MOBILE_BREAKPOINT_M = 375;
export const PORTRAIT_MOBILE_BREAKPOINT_L = 414;

export type PortraitMobileTier = 'small' | 'medium' | 'large';
export type BuyPanelLayoutKey =
	| 'portrait-small'
	| 'portrait-medium'
	| 'portrait-large'
	| 'desktop'
	| 'popout-l'
	| 'popout-s';

export type BuyPanelTextPx = { buyBonus: number; boostName: number; boostCost: number };

/** Общий aspect-ratio фона buy_bonus.png / bonus_switch.png. */
export const BUY_PANEL_ASPECT = 1233 / 613;

/** Пропорции текста Bonus Boost относительно Buy Bonus (стабильный масштаб). */
export const BUY_PANEL_BOOST_TEXT_RATIO = {
	name: 0.62,
	cost: 0.5,
} as const;

const buyPanelText = (buyBonus: number): BuyPanelTextPx => ({
	buyBonus,
	boostName: Math.round(buyBonus * BUY_PANEL_BOOST_TEXT_RATIO.name),
	boostCost: Math.max(7, Math.round(buyBonus * BUY_PANEL_BOOST_TEXT_RATIO.cost)),
});

/** Popout L (800×450) / Popout S (400×225) — единый масштаб панели Buy Bonus. */
export const POPOUT_L_PANEL_WIDTH = 124;
export const POPOUT_S_PANEL_WIDTH = 70;
export const POPOUT_S_SCALE = POPOUT_S_PANEL_WIDTH / POPOUT_L_PANEL_WIDTH;

/** Desktop vertical FS bonus bar (bar_v.png 247×592). Popout scales down with the embed. */
export const DESKTOP_BONUS_BAR_V_WIDTH_PX = 130;
export const DESKTOP_BONUS_BAR_V_HEIGHT_PX = 311.6;
export const POPOUT_L_BONUS_BAR_V_SCALE = 0.72;
export const POPOUT_S_BONUS_BAR_V_SCALE = 0.4;

export const scalePopoutPx = (px: number, min = 1) =>
	Math.max(min, Math.round(px * POPOUT_S_SCALE));

const popoutLText = buyPanelText(13);

/**
 * Размеры текста Buy Bonus / Bonus Boost (px).
 * Меняй buyBonus — boostName/boostCost пересчитаются автоматически.
 */
export const BUY_PANEL_TEXT_PX = {
	portrait: {
		small: buyPanelText(14),
		medium: buyPanelText(16),
		large: buyPanelText(18),
	},
	desktop: buyPanelText(17),
	popoutL: popoutLText,
	/** Popout S — те же пропорции, что popout L, × POPOUT_S_SCALE. boostName чуть меньше, чтобы «BONUS BOOST» влезал в одну строку. */
	popoutS: {
		buyBonus: scalePopoutPx(popoutLText.buyBonus),
		boostName: Math.max(3, scalePopoutPx(popoutLText.boostName) - 1),
		boostCost: scalePopoutPx(popoutLText.boostCost, 4),
	},
} as const satisfies Record<string, BuyPanelTextPx | Record<PortraitMobileTier, BuyPanelTextPx>>;

/** Bonus Boost toggle — popout L эталон, popout S пропорционально уменьшен. */
export const POPOUT_BOOST_TOGGLE = {
	l: { width: 30, height: 17, knob: 13, inset: 2, onLeft: 15 },
	s: {
		width: scalePopoutPx(30),
		height: scalePopoutPx(17),
		knob: scalePopoutPx(13),
		inset: scalePopoutPx(2, 1),
		onLeft: scalePopoutPx(15),
	},
} as const;

export const getPortraitMobileTier = (
	_canvasSizeType: PortraitCanvasSizeType,
	deviceWidth: number,
): PortraitMobileTier => {
	if (deviceWidth <= PORTRAIT_MOBILE_BREAKPOINT_M) return 'small';
	if (deviceWidth <= PORTRAIT_MOBILE_BREAKPOINT_L) return 'medium';
	return 'large';
};

const toPx = (n: number) => `${n}px`;

export const resolveBuyPanelText = (options: {
	layoutType: string;
	isPopout: boolean;
	isPopoutSmall: boolean;
	deviceWidth: number;
	canvasSizeType: PortraitCanvasSizeType;
}): { key: BuyPanelLayoutKey; buyBonus: string; boostName: string; boostCost: string } => {
	const { layoutType, isPopout, isPopoutSmall, deviceWidth, canvasSizeType } = options;

	if (layoutType === 'portrait') {
		const tier = getPortraitMobileTier(canvasSizeType, deviceWidth);
		const sizes = BUY_PANEL_TEXT_PX.portrait[tier];
		return {
			key: `portrait-${tier}` as BuyPanelLayoutKey,
			buyBonus: toPx(sizes.buyBonus),
			boostName: toPx(sizes.boostName),
			boostCost: toPx(sizes.boostCost),
		};
	}
	if (isPopoutSmall) {
		const sizes = BUY_PANEL_TEXT_PX.popoutS;
		return {
			key: 'popout-s',
			buyBonus: toPx(sizes.buyBonus),
			boostName: toPx(sizes.boostName),
			boostCost: toPx(sizes.boostCost),
		};
	}
	if (isPopout) {
		const sizes = BUY_PANEL_TEXT_PX.popoutL;
		return {
			key: 'popout-l',
			buyBonus: toPx(sizes.buyBonus),
			boostName: toPx(sizes.boostName),
			boostCost: toPx(sizes.boostCost),
		};
	}
	const sizes = BUY_PANEL_TEXT_PX.desktop;
	return {
		key: 'desktop',
		buyBonus: toPx(sizes.buyBonus),
		boostName: toPx(sizes.boostName),
		boostCost: toPx(sizes.boostCost),
	};
};

/** @deprecated use BUY_PANEL_TEXT_PX.portrait */
export const PORTRAIT_BUY_PANEL_TEXT = BUY_PANEL_TEXT_PX.portrait;

export const getPortraitBonusBarWidthPx = (canvasSizeType: PortraitCanvasSizeType) =>
	PORTRAIT_BONUS_BAR_WIDTH_PX * getPortraitSmallMobileScaleFactor(canvasSizeType);

export const getPortraitBonusBarHeightPx = (canvasSizeType: PortraitCanvasSizeType) =>
	PORTRAIT_BONUS_BAR_HEIGHT_PX * getPortraitSmallMobileScaleFactor(canvasSizeType);

/** ProgressLadder horizontal bar nudge from screen center (screen px, + = right). */
export const BONUS_BAR_H_SHIFT_SCREEN_X = 6;
/** ProgressLadder horizontal bar nudge downward on portrait phones (screen px, + = down). */
export const BONUS_BAR_H_SHIFT_SCREEN_Y = 24;

/** Portrait board parchment trim vs bonus bar (screen px) — neon frame reads slightly wider. */
export const PORTRAIT_BOARD_WIDTH_TRIM_PX = 14;

/** Visible parchment + neon frame (game coords), not full desk texture asset size. */
export const getPortraitParchmentSize = () => ({
	width: BOARD_SIZES.width * DESK_PARCHMENT_PADDING.width,
	height: BOARD_SIZES.height * DESK_PARCHMENT_PADDING.height,
});

/** Uniform board scale for portrait: parchment width on screen ≈ bonus bar − trim. */
export const getPortraitBoardTargetWidthPx = (canvasSizeType: PortraitCanvasSizeType) =>
	(PORTRAIT_BONUS_BAR_WIDTH_PX - PORTRAIT_BOARD_WIDTH_TRIM_PX) *
	getPortraitSmallMobileScaleFactor(canvasSizeType);

export const getPortraitBoardScale = (
	mainLayoutScale: number,
	canvasSizeType: PortraitCanvasSizeType,
) =>
	getPortraitBoardTargetWidthPx(canvasSizeType) /
	(getPortraitParchmentSize().width * mainLayoutScale);

/** Stake popout embed — 400×225 (mini) or 800×450 (expanded). Not phone portrait. */
export const isPopoutViewport = (sizes: { width: number; height: number }, tolerance = 12) => {
	const { width, height } = sizes;
	const match = (ew: number, eh: number) =>
		Math.abs(width - ew) <= tolerance && Math.abs(height - eh) <= tolerance;
	return match(400, 225) || match(800, 450);
};

/** Popout S only — stake mini player 400×225. */
export const isPopoutSmallViewport = (sizes: { width: number; height: number }, tolerance = 12) => {
	const { width, height } = sizes;
	return Math.abs(width - 400) <= tolerance && Math.abs(height - 225) <= tolerance;
};

export const getPopoutBonusBarVScale = (sizes: { width: number; height: number }) => {
	if (isPopoutSmallViewport(sizes)) return POPOUT_S_BONUS_BAR_V_SCALE;
	if (isPopoutViewport(sizes)) return POPOUT_L_BONUS_BAR_V_SCALE;
	return 1;
};

export const getDesktopBonusBarVDims = (sizes: { width: number; height: number }) => {
	const scale = getPopoutBonusBarVScale(sizes);
	return {
		w: DESKTOP_BONUS_BAR_V_WIDTH_PX * scale,
		h: DESKTOP_BONUS_BAR_V_HEIGHT_PX * scale,
	};
};

/**
 * Desktop / Popout HUD scales (ref. designer_assets/IMAGE 2026-06-02 13:12:00).
 * Popout S uses slightly smaller values so the cluster fits 400×225.
 */
export const DESKTOP_UI_LAYOUT = {
	utilScale: 0.68,
	utilX: { info: 140, menu: 224, hudText: 272 },
	spinCluster: {
		rightPad: 200,
		/** Сдвиг − | Spin | + | Autoplay вправо (px). Turbo следует за Autoplay. */
		shiftX: 40,
		betControlsGap: 16,
		spinScale: 1.05,
		/** Только Spin выше −/+ (отрицательный Y). */
		spinRaiseY: -18,
		smallScale: 0.62,
		autoplayGap: 12,
		autoplayScale: 0.9,
		turboGap: 22,
		turboScale: 0.56,
	},
	popoutSmall: {
		utilScale: 0.58,
		utilX: { info: 138, menu: 218, hudText: 256 },
		spinCluster: {
			rightPad: 188,
			shiftX: 32,
			betControlsGap: 12,
			spinScale: 0.92,
			spinRaiseY: -14,
			smallScale: 0.55,
			autoplayScale: 0.8,
			turboGap: 16,
			turboScale: 0.48,
		},
	},
} as const;

/**
 * Portrait mobile HUD (ref. designer_assets/IMAGE 2026-06-02 13:11:58, 800×1422).
 * Distances in ref px; components scale by mainLayoutStandard width/height.
 */
export const PORTRAIT_UI_LAYOUT = {
	refWidth: 800,
	refHeight: 1422,
	/** WIN text under board (ref px). */
	winBelowBoardGap: 62,
	/** Buy/boost row top offset from board bottom (ref px, independent of WIN). */
	buyPanelBelowBoard: 112,
	/** Extra WIN nudge down on portrait (ref px, + = down). */
	winNudgeDown: 12.5,
	/** Spin stack anchor below board when buy/boost hidden (free spins). */
	freeSpinsSpinBelowBoard: 48,
	/** Util-row center offset from screen bottom (ref px; ≈ iconRadius + 12px margin). */
	utilFromBottom: 50,
	/** Portrait buy panel CSS: width min(76vw, 360px), aspect 1233×613. */
	buyPanelWidthVw: 0.76,
	buyPanelMaxWidth: 360,
	buyPanelAspect: 613 / 1233,
	utilNudgeDown: 0,
	/** Min gap between menu/autoplay icons and balance/bet text (ref px, each side). */
	utilBalanceTextGap: 12,
	/** Min gap between util icon edges (ref px). */
	utilIconGap: 16,
	/** Balance/bet footer font (ref px). */
	utilBalanceFontSize: 26,
	utilX: { info: 68, menu: 172, autoplay: 608, turbo: 712 },
	/** Сдвиг − | Spin | + вправо (ref px). */
	spinClusterShiftX: 0,
	/** Ref px (800×1422 mockup) — scaled in UiCashStacksPortraitLayout. */
	buttons: {
		spinDiam: 172,
		spinBetDiam: 66,
		spinBetGap: 12,
		/** Только Spin выше −/+ (ref px, отрицательный Y). */
		spinRaiseY: -16,
		utilIconDiam: 76,
		autoplayW: 285,
		autoplayH: 70,
	},
} as const;

/** Base Pixi sizes for portrait util buttons (before container scale), ref UI_BASE_SIZE 150. */
/** Designer autoplay pill — ref designer_assets/autoplay.png (1912×739). */
export const AUTOPLAY_PILL_ASPECT = 1912 / 739;
export const AUTOPLAY_PILL_BASE = {
	width: Math.round(68 * AUTOPLAY_PILL_ASPECT),
	height: 68,
} as const;
export const PORTRAIT_UTIL_ICON_BASE = 108;
export const PORTRAIT_AUTOPLAY_PILL_BASE = AUTOPLAY_PILL_BASE;
export const PORTRAIT_TURBO_ICON_BASE = 108;

// New designer artwork comes from `designer_assets/Symbols/export/` — a
// single combined spine with bounce/win/explosion animations + per-symbol
// images. Rest/spin/static frames render via zero-movement `*/idle` spine
// clips (frozen with autoUpdate=false) so they match bounce/win quality from
// the same atlas textures. `land` plays the per-symbol bounce spine; dedicated
// `*/win` / `wave` clips drive W/B celebration.

// Per-symbol bounce on landing — slot-driven attachment matches the
// asset key, so each spine animates only the H_/L_ image we want.
const bounceSizeRatios = { width: 1, height: 1 };

const makePaySymbolIdle = (assetKey: string, clipPrefix: string) => ({
	type: 'spine' as const,
	assetKey,
	animationName: `${clipPrefix}/idle`,
	sizeRatios: bounceSizeRatios,
});

const h1Static = makePaySymbolIdle('H1', 'High_1');
const h2Static = makePaySymbolIdle('H2', 'High_2');
const h3Static = makePaySymbolIdle('H3', 'High_3');
const h4Static = makePaySymbolIdle('H4', 'High_4');
const l1Static = makePaySymbolIdle('L1', 'Low_1');
const l2Static = makePaySymbolIdle('L2', 'Low_2');
const l3Static = makePaySymbolIdle('L3', 'Low_3');
const l4Static = makePaySymbolIdle('L4', 'Low_4');
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

/** Mystery spine size — both static `?` (idle clip) and reveal explosion
 * share the same skeleton, so the size ratio also has to fit `Mystery_bg`
 * (196² in the atlas) into the 100² cell. SpineProvider scales by
 * `height / spineData.height` (256), so `M_SIZE = 1.3` → render scale
 * 1.3 × 100 / 256 ≈ 0.508, which renders Mystery_bg at ≈99 px — almost
 * exactly the cell. Smaller values left a gap of empty parchment around
 * the bg; larger values clipped the bg under the reel mask. The
 * explosion's flying parts naturally inherit the same scale, which is
 * what we want — they should occupy the same visual footprint as the
 * resting symbol. */
export const M_SIZE = 1.3;

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

/**
 * Wall-clock offset (ms) into `Mystery/explosion` when the spine drops
 * the `Mystery_bg` attachment and the revealed pay symbol should appear.
 * Matches the 1.5333s keyframe in Mystery.json — divide by timeScale in
 * turbo so the bg layer stays hidden until the cover actually lifts.
 */
export const MYSTERY_BG_UNCOVER_MS = 1533;

/** Pause after reels finish landing, before paylines/win animation start. */
export const WIN_INFO_PRE_DELAY_MS = 100;

/** Pause after win amount count-up finishes, before the celebration screen auto-dismisses. */
export const WIN_SCREEN_POST_COUNT_UP_DELAY_MS = 1500;

/** Full-screen dim behind FS end (FreeSpinOutro) count-up panel. */
export const FS_OUTRO_DIM_ALPHA = 0.85;
/** FS end fortune-cookie spine width as a fraction of board width (desktop/tablet). */
export const FS_OUTRO_SPINE_WIDTH_FRAC = 0.72;
/** Extra shrink for FS end cookie on phones (portrait + landscape). */
export const FS_OUTRO_PHONE_SCALE = {
	small: 0.82,
	medium: 0.86,
	large: 0.89,
} as const;

/**
 * Pause after reels finish landing, before bonus cats play the paw-wave
 * win animation (freeSpinTrigger / bonusCollect). Lets the BONUS-letter
 * land clip finish before scatter/collect highlight starts.
 */
export const BONUS_WIN_PRE_DELAY_MS = 400;

/** Pause after bonus paw-wave animation, before the next spin/reveal. */
export const BONUS_WIN_POST_DELAY_MS = 400;

/** Full cloud transition spine duration. */
export const TRANSITION_DURATION_MS = 1800;

/** Fade-in for board + UI after the loading-screen cloud transition. */
export const GAME_ENTRANCE_MS = 400;

/** When the cloud transition starts becoming opaque (~0.3s in the 1.5s spine). */
export const TRANSITION_THEME_SWITCH_DELAY_MS = 193;

/** When the bonus bar mounts — 1s before smoke clears, under the cloud layer. */
export const TRANSITION_LADDER_SHOW_DELAY_MS = TRANSITION_DURATION_MS - 1000;

/**
 * Пауза после того, как выигрышные символы полностью отыграли анимацию,
 * перед снятием затемнения и скрытием paylines.
 * Даёт игроку момент полюбоваться результатом до следующего этапа.
 */
export const WIN_SPOTLIGHT_CLEAR_DELAY_MS = 10_000;

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
// Mystery rest pose — render via the same Mystery spine (idle clip pins
// `Mystery_bg` + `Mystery_sign` attachments visible). The legacy static
// PNG was just `Mystery_sign.png` (the `?` glyph alone), so the dark
// hexagonal background was missing in static state. Using the spine
// guarantees both bg + glyph are rendered at the right relative offset
// and lines up perfectly with the explosion sequence on reveal.
const mStatic = {
	type: 'spine' as const,
	assetKey: 'M' as const,
	animationName: 'Mystery/idle',
	sizeRatios: { width: M_SIZE, height: M_SIZE },
};

const wStatic = {
	type: 'spine' as const,
	assetKey: 'W' as const,
	animationName: 'Special_2/idle',
	sizeRatios: bounceSizeRatios,
};
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
// Bonus landing plays the BONUS-letter reveal (`Special_1/win` on the
// text skeleton) when the kitty settles on the reel.
const bBounce = {
	type: 'spine' as const,
	assetKey: 'BWin' as const,
	animationName: 'Special_1/win',
	sizeRatios: bounceSizeRatios,
};
// Scatter / bonus-collect highlight plays the paw `wave` on the slim
// body skeleton (no text slots).
const bWin = {
	type: 'spine' as const,
	assetKey: 'B' as const,
	animationName: 'Special_1/wave',
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
		win: h1Static,
		postWinStatic: h1Static,
		static: h1Static,
		spin: h1Static,
		land: h1Bounce,
	},
	H2: {
		win: h2Static,
		postWinStatic: h2Static,
		static: h2Static,
		spin: h2Static,
		land: h2Bounce,
	},
	H3: {
		win: h3Static,
		postWinStatic: h3Static,
		static: h3Static,
		spin: h3Static,
		land: h3Bounce,
	},
	H4: {
		win: h4Static,
		postWinStatic: h4Static,
		static: h4Static,
		spin: h4Static,
		land: h4Bounce,
	},
	L1: {
		win: l1Static,
		postWinStatic: l1Static,
		static: l1Static,
		spin: l1Static,
		land: l1Bounce,
	},
	L2: {
		win: l2Static,
		postWinStatic: l2Static,
		static: l2Static,
		spin: l2Static,
		land: l2Bounce,
	},
	L3: {
		win: l3Static,
		postWinStatic: l3Static,
		static: l3Static,
		spin: l3Static,
		land: l3Bounce,
	},
	L4: {
		win: l4Static,
		postWinStatic: l4Static,
		static: l4Static,
		spin: l4Static,
		land: l4Bounce,
	},
	// Wild — `Special_2/idle` rest pose, bounce spine on land, dedicated
	// `Special_2/win` celebration spine on win (lights up the W/I/L/D letters).
	W: {
		postWinStatic: wStatic,
		static: wStatic,
		spin: wStatic,
		win: wWin,
		land: wBounce,
	},
	// Bonus — landing shows BONUS letters; scatter/collect win plays paw wave.
	B: {
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

/** Full duration of `Mystery/explosion` in seconds — used for reverse (collapse) timing. */
export const MYSTERY_EXPLOSION_DURATION_S = 2.0;

/**
 * Spine descriptor for the collapse-back-to-? animation.
 * `reverseAnimation: true` makes SpineTrack play the explosion backward.
 * `animationEnd` limits the playback range to the second half of the clip
 * (midpoint → 0), so only the "closing" phase is shown (~1 s instead of 2 s).
 */
export const MYSTERY_COLLAPSE_SPINE = {
	type: 'spine' as const,
	assetKey: 'M' as const,
	animationName: MYSTERY_REVEAL_ANIMATION,
	sizeRatios: mRevealSizeRatios,
	reverseAnimation: true as const,
	/** TrackEntry.animationEnd: reverse plays from this point back to 0. */
	animationEnd: MYSTERY_EXPLOSION_DURATION_S / 2,
};

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;
