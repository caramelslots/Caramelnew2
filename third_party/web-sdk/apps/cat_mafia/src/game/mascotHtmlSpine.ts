/** Aspect reference for the HTML mascot box (wide enough for idle3 hat toss). */
export const MASCOT_BASE_SIZE = { width: 520, height: 440 } as const;

/**
 * Render the Spine canvas larger than the on-screen box, then CSS-scale down.
 * Layer seams (eyes/ears) alias hard when the skeleton is drawn tiny on phones —
 * supersampling averages those edges away.
 */
export const MASCOT_SSAA = 2;
/** Phone portrait: cap SpinePlayer backing store (SSAA off, native dpr often 3). */
export const MASCOT_PHONE_MAX_DPR = 2;

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
 * Designer `hat` clip (~3.0s): out → shake → return.
 * Pause at shake (~1.90s) while coins land, then resume forward to the end.
 * (Do NOT reverse — the return is already in the second half of the clip.)
 */
export const MASCOT_HAT_HOLD_TIME_S = 1.9;
export const MASCOT_HAT_DURATION_S = 3.0;
export const MASCOT_HAT_CATCH_BEFORE_COINS_MS = Math.round(MASCOT_HAT_HOLD_TIME_S * 1000);
/** Squash press on the cell before the coin springs into its arc flight. */
export const MASCOT_COIN_ANTICIPATE_MS = 130;
/** CSS fly duration — keep in sync with `PawCoinOverlay` (one full turn). */
export const MASCOT_COIN_FLY_DURATION_MS = 820;
/** Stagger between successive coins (ms). */
export const MASCOT_COIN_FLY_STAGGER_MS = 70;
/**
 * Wall-clock wait after launching coins (anticipation + fly + stagger for a
 * full row + settle into the hold pose before hat resumes). The
 * handler extends it for multi-row resolves so the last coin lands first.
 */
export const MASCOT_COIN_FLY_WAIT_MS = 1400;
/** Resume hat from hold → end (~1.1s remaining). */
export const MASCOT_HAT_ON_MS = Math.round((MASCOT_HAT_DURATION_S - MASCOT_HAT_HOLD_TIME_S) * 1000);

/** Gun / load clip lengths (designer `cat_render`, wall-clock @ 1×). */
export const MASCOT_GUN_START_MS = 2530;
export const MASCOT_LOAD_MS = 670;
export const MASCOT_GUN_END_LOAD_MS = 1130;
export const MASCOT_GUN_STAT_IDLE_MS = 1430;
export const MASCOT_GUN_SHOT_AIM_MS = 1670;
export const MASCOT_GUN_SHOT_MS = 530;
export const MASCOT_GUN_SHOT_END_MS = 1500;
/**
 * Where paw-coins land while the hat is held out (idle3 brim-out / shake pose).
 * Fractions of the full mascot HTML box (includes left overscan). Measured by
 * rendering the idle3 hold pose offline (spine-core) through the real
 * SpinePlayer camera (viewport -1700/-200/3200/2900 + pads, fit-height zoom):
 * the bowl's dark opening centers at ~(0.16, 0.72) of the box; its front rim
 * (where the overlay starts clipping the coin) sits at ~0.755 box height.
 */
export const getMascotHatCatchPoint = (box: MascotScreenBox) => ({
	x: box.left + box.width * 0.16,
	y: box.top + box.height * 0.72,
	/** Front rim of the bowl opening (screen Y) — coins clip below it. */
	brimY: box.top + box.height * 0.755,
});

/**
 * `cartridge2` spine world (Y-up) on the open-hand frame of `gun_start`
 * (~0.30s — paw open at chin; closing begins ~0.50–0.55s).
 */
export const MASCOT_GUN_START_CATCH_WORLD = { x: -114, y: 1060 } as const;
/** Seconds into `gun_start` for the fly landing (open palm). */
export const MASCOT_GUN_START_CATCH_S = 0.3;
export const MASCOT_GUN_START_CATCH_MS = Math.round(MASCOT_GUN_START_CATCH_S * 1000);
/** Finger clamp after the open catch pose. */
export const MASCOT_GUN_START_SQUEEZE_S = 0.867;
export const MASCOT_GUN_START_SQUEEZE_MS = Math.round(MASCOT_GUN_START_SQUEEZE_S * 1000);

/**
 * Map a spine-world point into the mascot screen box (same framing as Pixi).
 */
export const spineWorldToMascotScreen = (
	box: MascotScreenBox,
	world: { x: number; y: number },
	viewport: MascotSpineViewport = MASCOT_SPINE_VIEWPORT,
) => {
	const t = getMascotPixiTransform(box, viewport);
	const cx = viewport.x + viewport.width * 0.5;
	const cy = viewport.y + viewport.height * 0.5;
	return {
		x: t.x + (world.x - cx) * t.scale,
		y: t.y + (cy - world.y) * t.scale,
	};
};

/**
 * Where FS cartridges land for the `gun_start` catch (catching-hand bone).
 */
export const getMascotBulletCatchPoint = (box: MascotScreenBox) =>
	spineWorldToMascotScreen(box, MASCOT_GUN_START_CATCH_WORLD);

/**
 * Approximate revolver muzzle during `gun_shot_aim` / `gun_shot` when the live
 * flash-bone sample is unavailable. Spine world (Y-up); biased to barrel tip.
 */
export const MASCOT_GUN_MUZZLE_WORLD = { x: -1220, y: 1720 } as const;

export const getMascotGunMuzzlePoint = (box: MascotScreenBox) =>
	spineWorldToMascotScreen(box, MASCOT_GUN_MUZZLE_WORLD);

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
 * SpinePlayer / Pixi viewport — keep the pre-`cat_render` framing.
 * Body bones match the old skeleton; this crop is what fixed size + position.
 * (Wider AABB from hat extremes must not re-center the character.)
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

const parsePadPct = (pad: string) => Number.parseFloat(pad) / 100;

export type MascotSpineViewport = {
	x: number;
	y: number;
	width: number;
	height: number;
	padLeft: string;
	padRight: string;
	padTop: string;
	padBottom: string;
};

/**
 * Dog skeleton AABB from `mascot_dog.json` (+ small margins for baton / glow).
 * Same pad fractions as the cat so `getMascotPixiTransform` framing matches.
 */
export const MASCOT_DOG_SPINE_VIEWPORT = {
	x: -760,
	y: -1080,
	width: 1560,
	height: 2020,
	padLeft: '8%',
	padRight: '6%',
	padTop: '10%',
	padBottom: '4%',
} as const satisfies MascotSpineViewport;

/**
 * Pixi transform that matches HTML SpinePlayer framing inside `box`
 * (fit-height + viewport pads). Apply `mirror` as Container.scale.x = -1.
 *
 * spine-pixi maps skeleton Y-up → Pixi Y-down, so viewport center `(cx, cy)`
 * in skeleton space lands at local `(-cx, -cy)` after the runtime flip —
 * offset the spine by `(cx, cy) * scale` (not the HTML scaleY=-1 path).
 */
export const getMascotPixiTransform = (
	box: MascotScreenBox,
	viewport: MascotSpineViewport = MASCOT_SPINE_VIEWPORT,
) => {
	const vp = viewport;
	const padT = parsePadPct(vp.padTop);
	const padB = parsePadPct(vp.padBottom);
	const padL = parsePadPct(vp.padLeft);
	const padR = parsePadPct(vp.padRight);
	const worldH = vp.height * (1 + padT + padB);
	const scale = box.height / worldH;
	const cx = vp.x + vp.width * 0.5;
	const cy = vp.y + vp.height * 0.5;
	return {
		x: box.left + box.width * 0.5,
		y: box.top + box.height * 0.5,
		spineX: -cx * scale,
		spineY: cy * scale,
		scale,
		worldW: vp.width * (1 + padL + padR),
		worldH,
	};
};

/** Pose keys used by `stateGame.mascotPose` / bullet-fly / FS shoot. */
export type MascotPose =
	| 'idle'
	| 'load'
	| 'aim'
	| 'shoot'
	| 'gunStart'
	| 'gunShotEnd'
	| 'gunEndLoad'
	| 'gunStatIdle'
	| 'gunStatLoad'
	| 'react'
	| 'wow'
	| 'clap'
	/** Designer `hat` — held out to catch paw coins. */
	| 'hatCatch'
	/** After coins land — settle back to idle (designer clip as-is for now). */
	| 'hatOn';

/** Spine animation names in `cat_render` white/gray `mascot_cat.json`. */
export type MascotSpineAnimation =
	| 'idle'
	| 'idle_blink'
	| 'idle_ears'
	| 'idle_gyn'
	| 'hat'
	| 'load'
	| 'like'
	| 'applause'
	| 'gun_start'
	| 'gun_shot_aim'
	| 'gun_shot'
	| 'gun_shot_end'
	| 'gun_end_load'
	| 'gun_shot_stat_idle'
	| 'gun_shot_stat_load';

/** All clips (viewport + runtime). */
export const MASCOT_SPINE_ANIMATIONS: readonly MascotSpineAnimation[] = [
	'idle',
	'idle_blink',
	'idle_ears',
	'idle_gyn',
	'hat',
	'load',
	'like',
	'applause',
	'gun_start',
	'gun_shot_aim',
	'gun_shot',
	'gun_shot_end',
	'gun_end_load',
	'gun_shot_stat_idle',
	'gun_shot_stat_load',
] as const;

/** DEV-only preview ids (map 1:1 to Spine clips). */
export type MascotDevPreview = MascotSpineAnimation;

export type MascotDevPreviewItem = {
	id: MascotDevPreview;
	label: string;
	title: string;
};

/** DEV panel — every cat Spine clip for QA. */
export const MASCOT_DEV_PREVIEW_ITEMS: readonly MascotDevPreviewItem[] =
	MASCOT_SPINE_ANIMATIONS.map((id) =>
		id === 'hat'
			? {
					id,
					label: 'hat',
					title: 'In-game hat sequence: out → pause → finish forward (loops)',
				}
			: {
					id,
					label: id,
					title: `Play Spine clip "${id}" (loop)`,
				},
	);

/** @deprecated use MASCOT_DEV_PREVIEW_ITEMS */
export const MASCOT_DEV_PREVIEW_ANIMATIONS: readonly MascotSpineAnimation[] =
	MASCOT_SPINE_ANIMATIONS;

type PosePlayback = {
	animation: MascotSpineAnimation;
	loop: boolean;
	/** After a one-shot finishes, fall back to this pose animation (loop). */
	returnTo?: MascotSpineAnimation;
	/** Play clip backwards (legacy hat put-on — unused while designer hat is as-is). */
	reverse?: boolean;
	/** Freeze on the last frame instead of returning (hat held out). */
	holdEnd?: boolean;
};

/**
 * Pose → Spine mapping (`designer_assets/cat_render`):
 * - like (`react`) = Big / Super Win celebration (one-shot → idle)
 * - applause (`clap`) = Epic / Sensational celebration (play once)
 * - hat = paw coin catch
 * - gun_start = catch BT fly at the hand; load / gun_end_load seat the drum after
 * - gun_shot_* = FS target pick (stat_idle → aim loop → shoot on tap → end)
 *   and Stage E drum shoot round (stat_idle → aim loop → shoot×N → end)
 */
export const MASCOT_POSE_PLAYBACK: Record<MascotPose, PosePlayback> = {
	idle: { animation: 'idle', loop: true },
	load: { animation: 'load', loop: false, holdEnd: true },
	gunStart: { animation: 'gun_start', loop: false, holdEnd: true },
	aim: { animation: 'gun_shot_aim', loop: true },
	shoot: { animation: 'gun_shot', loop: false, holdEnd: true },
	gunShotEnd: { animation: 'gun_shot_end', loop: false, returnTo: 'idle' },
	gunEndLoad: { animation: 'gun_end_load', loop: false, returnTo: 'idle' },
	gunStatIdle: { animation: 'gun_shot_stat_idle', loop: false, holdEnd: true },
	gunStatLoad: { animation: 'gun_shot_stat_load', loop: false, holdEnd: true },
	react: { animation: 'like', loop: false, returnTo: 'idle' },
	/** @deprecated Prefer `clap` for big wins — kept as applause once for safety. */
	wow: { animation: 'applause', loop: false, holdEnd: true },
	clap: { animation: 'applause', loop: false, holdEnd: true },
	hatCatch: { animation: 'hat', loop: false, holdEnd: true },
	/** Resume `hat` forward from the pause (no reverse). */
	hatOn: { animation: 'hat', loop: false, returnTo: 'idle' },
};

/** Idle flavour clips randomly queued while pose stays `idle` (excludes base idle). */
export const MASCOT_IDLE_VARIANTS: readonly MascotSpineAnimation[] = [
	'idle_blink',
	'idle_ears',
	'idle_gyn',
];

/**
 * Weighted idle roll — includes base `idle` (skip flavour).
 * 40% idle / 30% blink / 20% ears / 10% gyn.
 */
export const MASCOT_IDLE_VARIANT_WEIGHTS: ReadonlyArray<{
	animation: MascotSpineAnimation;
	weight: number;
}> = [
	{ animation: 'idle', weight: 0.4 },
	{ animation: 'idle_blink', weight: 0.3 },
	{ animation: 'idle_ears', weight: 0.2 },
	{ animation: 'idle_gyn', weight: 0.1 },
] as const;

export const pickMascotIdleVariant = (): MascotSpineAnimation => {
	const total = MASCOT_IDLE_VARIANT_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
	let roll = Math.random() * total;
	for (const item of MASCOT_IDLE_VARIANT_WEIGHTS) {
		roll -= item.weight;
		if (roll <= 0) return item.animation;
	}
	return 'idle';
};

/** Delay before the next idle flavour clip (ms). */
export const nextMascotIdleVariantDelayMs = () => 2200 + Math.random() * 3200;

/** static/ asset path relative to deployed index.html (Stake CDN subpath-safe). */
export const resolveMascotSpineUrl = (file: string) =>
	new URL(`assets/spines/mascot/${file}`.replace(/^\//, ''), window.location.href).href;

export const MASCOT_SPINE_FILES = [
	'white/mascot_cat.json',
	'white/mascot_cat.atlas',
	'white/mascot_cat.png',
	'gray/mascot_cat.json',
	'gray/mascot_cat.atlas',
	'gray/mascot_cat.png',
] as const;

export const MASCOT_DOG_SPINE_FILES = [
	'mascot_dog.json',
	'mascot_dog.atlas',
	'mascot_dog.png',
	'mascot_dog_2.png',
] as const;

export const MASCOT_SPINE_ASSET_URLS = MASCOT_SPINE_FILES.map(resolveMascotSpineUrl);
export const MASCOT_DOG_SPINE_ASSET_URLS = MASCOT_DOG_SPINE_FILES.map(resolveMascotSpineUrl);

/** Atlas image — keep PNG (lossy WebP breaks PMA mesh edges). White = freegame / duel. */
export const MASCOT_SPINE_IMAGE_URL = resolveMascotSpineUrl('white/mascot_cat.png');
export const MASCOT_SPINE_GRAY_IMAGE_URL = resolveMascotSpineUrl('gray/mascot_cat.png');

/** Spine clip names in `mascot_dog.json`. */
export type MascotDogSpineAnimation =
	| 'idle'
	| 'idle_glow'
	| 'idle_mouth'
	| 'blinking'
	| 'angry_final'
	| 'test';

export const MASCOT_DOG_SPINE_ANIMATIONS: readonly MascotDogSpineAnimation[] = [
	'idle',
	'idle_glow',
	'idle_mouth',
	'blinking',
	'angry_final',
	'test',
] as const;

export type MascotDogDevPreviewItem = {
	id: MascotDogSpineAnimation;
	label: string;
	title: string;
};

/** DEV panel — every dog Spine clip for QA. */
export const MASCOT_DOG_DEV_PREVIEW_ITEMS: readonly MascotDogDevPreviewItem[] = [
	{ id: 'idle', label: 'idle', title: 'Play dog Spine clip "idle" (loop)' },
	{ id: 'blinking', label: 'blinking', title: 'Play dog Spine clip "blinking" (loop)' },
	{ id: 'idle_mouth', label: 'idle_mouth', title: 'Play dog Spine clip "idle_mouth" (loop)' },
	{ id: 'idle_glow', label: 'idle_glow', title: 'Play dog Spine clip "idle_glow" (loop)' },
	{ id: 'angry_final', label: 'angry_final', title: 'Play dog Spine clip "angry_final" (loop)' },
	{ id: 'test', label: 'test', title: 'Play dog Spine clip "test" (loop)' },
] as const;

/** Idle flavour clips randomly queued while the dog pose stays `idle`. */
export const MASCOT_DOG_IDLE_VARIANTS: readonly MascotDogSpineAnimation[] = [
	'blinking',
	'idle_mouth',
	'idle_glow',
	'angry_final',
] as const;

/** blinking often; mouth / glow / angry less often. */
export const MASCOT_DOG_IDLE_VARIANT_WEIGHTS: ReadonlyArray<{
	animation: MascotDogSpineAnimation;
	weight: number;
}> = [
	{ animation: 'blinking', weight: 0.4 },
	{ animation: 'idle_mouth', weight: 0.2 },
	{ animation: 'idle_glow', weight: 0.2 },
	{ animation: 'angry_final', weight: 0.2 },
] as const;

export const pickMascotDogIdleVariant = (): MascotDogSpineAnimation => {
	const total = MASCOT_DOG_IDLE_VARIANT_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
	let roll = Math.random() * total;
	for (const item of MASCOT_DOG_IDLE_VARIANT_WEIGHTS) {
		roll -= item.weight;
		if (roll <= 0) return item.animation;
	}
	return 'blinking';
};

/**
 * Map shared `mascotPose` beats onto dog clips.
 * Duel left mascot stays on idle flavour (angry_final is an idle variant, not a loss pose).
 */
export const MASCOT_DOG_POSE_PLAYBACK: Record<
	MascotPose,
	{ animation: MascotDogSpineAnimation; loop: boolean; returnTo?: MascotDogSpineAnimation }
> = {
	idle: { animation: 'idle', loop: true },
	load: { animation: 'idle', loop: true },
	aim: { animation: 'idle', loop: true },
	shoot: { animation: 'idle', loop: true },
	gunStart: { animation: 'idle', loop: true },
	gunShotEnd: { animation: 'idle', loop: true },
	gunEndLoad: { animation: 'idle', loop: true },
	gunStatIdle: { animation: 'idle', loop: true },
	gunStatLoad: { animation: 'idle', loop: true },
	react: { animation: 'idle', loop: true },
	wow: { animation: 'idle_glow', loop: true },
	clap: { animation: 'idle_mouth', loop: true },
	hatCatch: { animation: 'idle', loop: true },
	hatOn: { animation: 'idle', loop: true },
};

let mascotSpinePreloadStarted = false;

/** Warm HTTP cache for HTML mascot Spine during the loading-screen idle window. */
export const startMascotSpinePreload = () => {
	if (mascotSpinePreloadStarted || typeof window === 'undefined') return;
	mascotSpinePreloadStarted = true;

	const queue = [...MASCOT_SPINE_ASSET_URLS, ...MASCOT_DOG_SPINE_ASSET_URLS];
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
