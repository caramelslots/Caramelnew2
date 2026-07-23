/** Aspect reference for the HTML mascot box (wide enough for idle3 hat toss). */
export const MASCOT_BASE_SIZE = { width: 520, height: 440 } as const;

/** Mascot height as a fraction of the board’s on-screen height. */
export const MASCOT_BOARD_HEIGHT_FRAC = 1.28;
/** Horizontal gap after board edge, as a fraction of board height. */
export const MASCOT_GAP_FRAC = 0.25;
/**
 * Feet Y relative to board center (+down), as a fraction of board half-height.
 * ~1.0 = board bottom; >1 sits on the street / HUD floor below the board.
 * Same on desktop / laptop / popout (phones excluded by caller).
 */
export const MASCOT_FEET_Y_FRAC = 2.45;
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
 * Screen box for the mascot, anchored to the board so PC / laptop / popout
 * keep the same relative pose (phones excluded by the caller).
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

/** @deprecated prefer getMascotScreenBox — kept for any leftover scale callers. */
export const getMascotBoxSize = (scale = 1) => ({
	width: Math.round(MASCOT_BASE_SIZE.width * scale),
	height: Math.round(MASCOT_BASE_SIZE.height * scale),
});

/**
 * SpinePlayer viewport — expanded left/top for idle3 hat toss
 * (hat translate ~ -970 x / +1400 y beyond setup pose).
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
export type MascotPose = 'idle' | 'load' | 'aim' | 'shoot' | 'react' | 'wow' | 'clap';

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

/** DEV panel buttons — idle family only (action clips hidden). */
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
};

/**
 * Temporary pose → Spine mapping (adjust freely):
 * - idle2 = clap hands
 * - idle3 = hat celebration (wow)
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
};

/** Idle flavour clips randomly queued while pose stays `idle`. */
export const MASCOT_IDLE_VARIANTS: readonly MascotSpineAnimation[] = ['idle_blink', 'idle3_ears'];

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
