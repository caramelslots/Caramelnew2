/** Aspect reference for the HTML mascot box (wide enough for idle3 hat toss). */
export const MASCOT_BASE_SIZE = { width: 520, height: 440 } as const;

/** Mascot height as a fraction of the board’s on-screen height. */
export const MASCOT_BOARD_HEIGHT_FRAC = 1.25;
/** Horizontal gap after board edge, as a fraction of board height. */
export const MASCOT_GAP_FRAC = 0.07;
/**
 * Feet Y relative to board center (+down), as a fraction of board half-height.
 * ~1.0 = board bottom; >1 sits on the street / HUD floor below the board.
 * Same on desktop / laptop / popout (phones excluded by caller).
 */
export const MASCOT_FEET_Y_FRAC = 1.3;
/** Where the feet sit inside the mascot box (0 top → 1 bottom). */
export const MASCOT_FEET_IN_BOX = 0.92;
/**
 * Extra width is added on the left so idle3 arm/hat aren’t clipped, while the
 * body still reads as sitting just right of the board.
 */
export const MASCOT_LEFT_OVERSCAN_FRAC = 0.28;

export type MascotScreenBox = {
	left: number;
	top: number;
	width: number;
	height: number;
	/** Left edge of the body column (excludes idle3 left overscan). */
	bodyLeft: number;
	bodyWidth: number;
};

/**
 * idle3 timing (designer `hat` clip, truncated at brim-out):
 * - hat out ~1.73s, shake ~1.90–2.57s, hold last frame for coins, reverse = put-on.
 */
export const MASCOT_HAT_CATCH_BEFORE_COINS_MS = 1950;
/** CSS fly duration — keep in sync with `PawCoinOverlay` keyframes. */
export const MASCOT_COIN_FLY_DURATION_MS = 550;
/** Stagger between successive coins (ms). */
export const MASCOT_COIN_FLY_STAGGER_MS = 60;
/**
 * Wall-clock wait after launching coins (fly + stagger for a full row + settle
 * into the shake / hold pose before hat-on reverse).
 */
export const MASCOT_COIN_FLY_WAIT_MS = 800;
/** Reverse idle3 put-on (~clip length 2.57s). */
export const MASCOT_HAT_ON_MS = 2600;

/**
 * Where paw-coins land while the hat is held out (idle3 brim-out / shake pose).
 * Fractions of the full mascot HTML box (includes left overscan). Aim at the
 * open brim (left/lower than the hat bone center — coins were landing high-right).
 */
export const getMascotHatCatchPoint = (box: MascotScreenBox) => ({
	x: box.left + box.width * 0.12,
	y: box.top + box.height * 0.68,
});

/**
 * Screen box for the mascot, anchored to the board so PC / laptop / popout
 * keep the same relative pose.
 */
export const getMascotScreenBox = (board: {
	centerX: number;
	centerY: number;
	halfW: number;
	halfH: number;
}): MascotScreenBox => {
	const boardH = board.halfH * 2;
	const height = Math.round(boardH * MASCOT_BOARD_HEIGHT_FRAC);
	const width = Math.round(height * (MASCOT_BASE_SIZE.width / MASCOT_BASE_SIZE.height));
	const overscan = Math.round(width * MASCOT_LEFT_OVERSCAN_FRAC);
	const bodyWidth = width - overscan;
	const bodyLeft = Math.round(board.centerX + board.halfW + boardH * MASCOT_GAP_FRAC);
	const left = bodyLeft - overscan;
	const feetY = board.centerY + board.halfH * MASCOT_FEET_Y_FRAC;
	const top = Math.round(feetY - height * MASCOT_FEET_IN_BOX);
	return { left, top, width, height, bodyLeft, bodyWidth };
};

/**
 * Phone portrait size caps (height = min of these).
 * Bump any of these to enlarge the mascot next to Buy Bonus.
 */
export const MASCOT_PORTRAIT_HEIGHT_VS_BUY = 4.9;
/** vs board half-height (`halfH`). Was 2.05. */
export const MASCOT_PORTRAIT_HEIGHT_VS_HALFH = 3.15;
export const MASCOT_PORTRAIT_HEIGHT_VS_CANVAS_W = 0.95;
/** Body left edge vs canvas center (px). Negative = left. */
export const MASCOT_PORTRAIT_BODY_LEFT_OFFSET = -30;

/**
 * Phone portrait: under the board, to the right of the Buy Bonus button.
 */
export const getMascotPortraitScreenBox = (opts: {
	canvasWidth: number;
	boardCenterY: number;
	halfH: number;
	buyPanelTop: number;
	buyPanelHeight: number;
}): MascotScreenBox => {
	const height = Math.round(
		Math.min(
			opts.buyPanelHeight * MASCOT_PORTRAIT_HEIGHT_VS_BUY,
			opts.halfH * MASCOT_PORTRAIT_HEIGHT_VS_HALFH,
			opts.canvasWidth * MASCOT_PORTRAIT_HEIGHT_VS_CANVAS_W,
		),
	);
	const width = Math.round(height * (MASCOT_BASE_SIZE.width / MASCOT_BASE_SIZE.height));
	const overscan = Math.round(width * 0.22);
	const bodyWidth = width - overscan;
	// Buy Bonus sits on the left half; body starts near canvas center, nudged left.
	const bodyLeft = Math.round(opts.canvasWidth * 0.5 + MASCOT_PORTRAIT_BODY_LEFT_OFFSET);
	const left = bodyLeft - overscan;
	// Tuck up under the board (hat closer to reel frame).
	const top = Math.round(opts.buyPanelTop - height * 0.32);
	return { left, top, width, height, bodyLeft, bodyWidth };
};

/** @deprecated prefer getMascotScreenBox — kept for any leftover scale callers. */
export const getMascotBoxSize = (scale = 1) => ({
	width: Math.round(MASCOT_BASE_SIZE.width * scale),
	height: Math.round(MASCOT_BASE_SIZE.height * scale),
});

/**
 * SpinePlayer viewport — expanded left/top for idle3 hat toss
 * (hat translate ~ -1225 x / +1575 y beyond setup pose).
 */
export const MASCOT_SPINE_VIEWPORT = {
	x: -1700,
	y: -200,
	width: 3200,
	height: 2900,
	padLeft: '8%',
	padRight: '6%',
	padTop: '10%',
	padBottom: '4%',
} as const;

/** Pose keys used by `stateGame.mascotPose` / bullet-fly. */
export type MascotPose =
	| 'idle'
	| 'load'
	| 'aim'
	| 'shoot'
	| 'react'
	| 'wow'
	| 'clap'
	/** idle3 forward — hat held out to catch paw coins. */
	| 'hatCatch'
	/** idle3 reversed — puts hat back on after coins land. */
	| 'hatOn';

/** Spine animation names in `mascot_cat.json`. */
export type MascotSpineAnimation =
	| 'idle'
	| 'idle2'
	| 'idle3'
	| 'idle3_ears'
	| 'idle_blink'
	| 'animation'
	| 'animation2'
	| 'animation3';

/** All clips (viewport + runtime). */
export const MASCOT_SPINE_ANIMATIONS: readonly MascotSpineAnimation[] = [
	'idle',
	'idle2',
	'idle3',
	'idle3_ears',
	'idle_blink',
	'animation',
	'animation2',
	'animation3',
] as const;

/** DEV-only preview ids (map 1:1 to Spine clips, with idle3 = in-game hat sequence). */
export type MascotDevPreview = MascotSpineAnimation;

export type MascotDevPreviewItem = {
	id: MascotDevPreview;
	label: string;
	title: string;
};

/**
 * DEV panel buttons — idle family only.
 * `idle3` = in-game hat sequence (forward → hold → reverse).
 */
export const MASCOT_DEV_PREVIEW_ITEMS: readonly MascotDevPreviewItem[] = [
	{ id: 'idle', label: 'idle', title: 'Play Spine clip "idle" (loop)' },
	{ id: 'idle2', label: 'idle2', title: 'Play Spine clip "idle2" (loop)' },
	{
		id: 'idle3',
		label: 'idle3 (hat)',
		title: 'In-game hat sequence: idle3 out → hold → reverse on (loops)',
	},
	{ id: 'idle3_ears', label: 'idle3_ears', title: 'Play Spine clip "idle3_ears" (loop)' },
	{ id: 'idle_blink', label: 'idle_blink', title: 'Play Spine clip "idle_blink" (loop)' },
] as const;

/** @deprecated use MASCOT_DEV_PREVIEW_ITEMS */
export const MASCOT_DEV_PREVIEW_ANIMATIONS: readonly MascotSpineAnimation[] = [
	'idle',
	'idle2',
	'idle3',
	'idle3_ears',
	'idle_blink',
] as const;

type PosePlayback = {
	animation: MascotSpineAnimation;
	loop: boolean;
	/** After a one-shot finishes, fall back to this pose animation (loop). */
	returnTo?: MascotSpineAnimation;
	/** Play clip backwards (hat back onto head). */
	reverse?: boolean;
	/** Freeze on the last frame instead of returning (hat held out). */
	holdEnd?: boolean;
};

/**
 * Temporary pose → Spine mapping (adjust freely):
 * - idle2 = clap hands
 * - idle3 = designer hat collect (hatCatch hold at brim-out ~2.57s) + reverse put-on (hatOn);
 *   hand/fingers + purple hat meshes; hat is out by ~1.73s
 * - idle3_ears = alert / aim
 * - animation / animation2 / animation3 = action beats
 */
export const MASCOT_POSE_PLAYBACK: Record<MascotPose, PosePlayback> = {
	idle: { animation: 'idle', loop: true },
	load: { animation: 'animation', loop: false, returnTo: 'idle' },
	aim: { animation: 'idle3_ears', loop: true },
	shoot: { animation: 'animation2', loop: false, returnTo: 'idle3_ears' },
	react: { animation: 'animation3', loop: false, returnTo: 'idle' },
	wow: { animation: 'idle3', loop: true },
	clap: { animation: 'idle2', loop: true },
	hatCatch: { animation: 'idle3', loop: false, holdEnd: true },
	hatOn: { animation: 'idle3', loop: false, reverse: true, returnTo: 'idle' },
};

/** Idle flavour clips randomly queued while pose stays `idle`. */
export const MASCOT_IDLE_VARIANTS: readonly MascotSpineAnimation[] = ['idle_blink', 'idle3_ears'];

/** Weighted idle flavour — blink often, ear twitch less often. */
export const MASCOT_IDLE_VARIANT_WEIGHTS: ReadonlyArray<{
	animation: MascotSpineAnimation;
	weight: number;
}> = [
	{ animation: 'idle_blink', weight: 0.72 },
	{ animation: 'idle3_ears', weight: 0.28 },
] as const;

export const pickMascotIdleVariant = (): MascotSpineAnimation => {
	const total = MASCOT_IDLE_VARIANT_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
	let roll = Math.random() * total;
	for (const item of MASCOT_IDLE_VARIANT_WEIGHTS) {
		roll -= item.weight;
		if (roll <= 0) return item.animation;
	}
	return 'idle_blink';
};

/** Delay before the next idle flavour clip (ms). */
export const nextMascotIdleVariantDelayMs = () => 2200 + Math.random() * 3200;

/** static/ asset path relative to deployed index.html (Stake CDN subpath-safe). */
export const resolveMascotSpineUrl = (file: string) =>
	new URL(`assets/spines/mascot/${file}`.replace(/^\//, ''), window.location.href).href;

export const MASCOT_SPINE_FILES = [
	'mascot_cat.json',
	'mascot_cat.atlas',
	'mascot_cat.png',
] as const;

export const MASCOT_SPINE_ASSET_URLS = MASCOT_SPINE_FILES.map(resolveMascotSpineUrl);

/** Atlas image — keep PNG (lossy WebP breaks PMA mesh edges). */
export const MASCOT_SPINE_IMAGE_URL = resolveMascotSpineUrl('mascot_cat.png');

let mascotSpinePreloadStarted = false;

/** Warm HTTP cache for HTML mascot Spine during the loading-screen idle window. */
export const startMascotSpinePreload = () => {
	if (mascotSpinePreloadStarted || typeof window === 'undefined') return;
	mascotSpinePreloadStarted = true;

	const queue = [...MASCOT_SPINE_ASSET_URLS];
	const workerCount = Math.min(3, queue.length);

	void Promise.all(
		Array.from({ length: workerCount }, async () => {
			while (queue.length > 0) {
				const url = queue.shift();
				if (!url) break;

				try {
					await fetch(url);
				} catch {
					/* Best-effort — SpinePlayer will retry on mount. */
				}
			}
		}),
	);
};
