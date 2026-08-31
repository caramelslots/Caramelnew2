/**
 * Designer handoff: `designer_assets/bullet` — shot projectile + impact.
 * Used when the mascot fires at a freeSpinTargetPick seat.
 */

const SPRITE_BASE = `${import.meta.env.BASE_URL}assets/sprites/shotBullet`;

export const shotBulletSpriteUrl = (file: string) =>
	`${SPRITE_BASE}/${file.replace(/^\//, '')}`;

export const resolveShotBulletSpineUrl = (file: string) =>
	new URL(`assets/spines/shotBullet/${file}`.replace(/^\//, ''), window.location.href).href;

export const SHOT_BULLET_SPRITES = {
	bullet: shotBulletSpriteUrl('bullet.webp'),
} as const;

/**
 * Delay after `gun_shot` starts before the projectile leaves the muzzle.
 * Matches designer muzzle-flash attachments (`1_0000*`) @ ~0.333s.
 */
export const TARGET_SHOT_MUZZLE_DELAY_MS = 333;

/** Pistol → target flight time (elongated gallery hook needs room to read). */
export const TARGET_SHOT_FLY_MS = 480;

/** Impact flash duration — Spine `explosion_bullet` reads in ~0.37s of glow. */
export const TARGET_SHOT_IMPACT_MS = 420;

/**
 * Delay after the bullet lands before the disc flip (~100ms after impact,
 * slightly after the explosion burst starts).
 */
export const TARGET_SHOT_EXPLOSION_START_MS = 100;

/** How long the drawn flight path wipes muzzle→tip after impact. */
export const TARGET_SHOT_PATH_FADE_MS = 120;

/** Sampled polyline for a stylized gallery shot. */
export type TargetShotCurve = {
	/** Dense path samples muzzle → seat (inclusive) — bullet motion. */
	points: { x: number; y: number }[];
	flyMs: number;
	/** FPS-independent SVG cubic (M + C) for the trail stroke. */
	svgPath: string;
};

/**
 * Gun→target orientation. Desktop: mascot on the side. Portrait: mascot under
 * the board.
 */
export type TargetShotOrientation = 'side' | 'below';

const cubicPoint = (
	t: number,
	p0x: number,
	p0y: number,
	p1x: number,
	p1y: number,
	p2x: number,
	p2y: number,
	p3x: number,
	p3y: number,
) => {
	const u = 1 - t;
	const uu = u * u;
	const uuu = uu * u;
	const tt = t * t;
	const ttt = tt * t;
	return {
		x: uuu * p0x + 3 * uu * t * p1x + 3 * u * tt * p2x + ttt * p3x,
		y: uuu * p0y + 3 * uu * t * p1y + 3 * u * tt * p2y + ttt * p3y,
	};
};

/** Single cubic Bezier SVG path — stays smooth even when RAF is sparse. */
export const cubicSvgPath = (
	p0: { x: number; y: number },
	p1: { x: number; y: number },
	p2: { x: number; y: number },
	p3: { x: number; y: number },
) =>
	`M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}, ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`;

/** Dense polyline fallback when control points are unavailable. */
export const polylineSvgPath = (points: { x: number; y: number }[]) => {
	if (points.length === 0) return '';
	if (points.length === 1) return `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
	const [first, ...rest] = points;
	return `M ${first!.x.toFixed(1)} ${first!.y.toFixed(1)} ${rest
		.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
		.join(' ')}`;
};

export const resolveTargetShotOrientation = (start: {
	x: number;
	y: number;
}, end: { x: number; y: number }): TargetShotOrientation => {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	if (dy < 0 && Math.abs(dy) > Math.abs(dx) * 0.85) return 'below';
	return 'side';
};

/**
 * Pleasant lofted parabola muzzle → seat for far/mid seats.
 * Nearest column (right: seats …2, …5, …8) uses the pre-screenshot gallery hook.
 */
export const buildTargetShotCurve = (args: {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	seatIndex: number;
	orientation?: TargetShotOrientation;
}): TargetShotCurve => {
	const dx = args.endX - args.startX;
	const dy = args.endY - args.startY;
	const dist = Math.hypot(dx, dy) || 1;
	const orientation =
		args.orientation ??
		resolveTargetShotOrientation({ x: args.startX, y: args.startY }, { x: args.endX, y: args.endY });

	const seat = Math.max(0, args.seatIndex | 0);
	const col = seat % 3;
	const row = Math.floor(seat / 3);
	const topRow = row === 0;
	const nearestColumn = col === 2; // right column — closest to the side gun

	let p1x: number;
	let p1y: number;
	let p2x: number;
	let p2y: number;

	if (nearestColumn) {
		// Pre-screenshot gallery hook. BR bows upward; TR is the vertical mirror.
		if (orientation === 'below') {
			const pull = Math.max(140, Math.min(280, 150 + Math.abs(dy) * 0.45 + dist * 0.22));
			const lift = Math.max(110, Math.min(240, 120 + Math.abs(dx) * 0.35 + dist * 0.18));
			const side = topRow ? -1 : 1;
			p1x = args.startX + side * lift * 0.35;
			p1y = args.startY + dy * 0.16 - pull * 0.28;
			p2x = args.startX + side * lift * 0.85;
			p2y = Math.min(args.startY, args.endY) - pull * 0.9;
		} else {
			// Stronger pull toward board center so the arc reads longer.
			const pull = Math.max(240, Math.min(480, 280 + Math.abs(dx) * 0.75 + dist * 0.35));
			const lift = Math.max(110, Math.min(260, 140 + Math.max(0, -dy) * 0.25 + Math.abs(dy) * 0.2));
			const apexX = Math.min(args.startX, args.endX) - pull * 0.82;
			// BR: peak above. TR: same shape mirrored below.
			const sign = topRow ? 1 : -1;
			p1x = args.startX - pull * 0.38;
			p1y = args.startY + sign * lift * 0.18;
			p2x = apexX;
			p2y = topRow
				? Math.max(args.startY, args.endY) + lift
				: Math.min(args.startY, args.endY) - lift;
		}
	} else if (orientation === 'below') {
		// Far/mid on phone — soft rise with a light lateral bow.
		const loftScale = topRow ? 1.08 : 0.92;
		const loft = Math.max(120, Math.min(300, (dist * 0.36 + Math.max(0, -dy) * 0.2) * loftScale));
		const col = seat % 3;
		const side = col === 0 ? -1 : topRow ? -0.35 : 0.35;
		const bow = Math.max(70, Math.min(180, dist * 0.28));
		p1x = args.startX + dx * 0.22 + side * bow * 0.55;
		p1y = args.startY + dy * 0.22;
		p2x = args.startX + dx * 0.62 + side * bow;
		p2y = args.startY + dy * 0.55 - loft * 0.25;
	} else {
		// Far/mid desktop — classic up-then-down parabola.
		const loftScale = topRow ? 1.08 : 0.92;
		const loft = Math.max(120, Math.min(300, (dist * 0.36 + Math.max(0, -dy) * 0.2) * loftScale));
		p1x = args.startX + dx * 0.2;
		p1y = args.startY - loft * 0.5;
		p2x = args.startX + dx * 0.6;
		p2y = Math.min(args.startY, args.endY) - loft;
	}

	const samples = 48;
	const points: { x: number; y: number }[] = [];
	for (let i = 0; i <= samples; i++) {
		const t = i / samples;
		points.push(
			cubicPoint(t, args.startX, args.startY, p1x, p1y, p2x, p2y, args.endX, args.endY),
		);
	}

	const flyMs = nearestColumn
		? Math.max(420, Math.min(580, 360 + dist * 0.28))
		: Math.max(380, Math.min(560, 320 + dist * 0.22));
	return {
		points,
		flyMs,
		svgPath: cubicSvgPath(
			{ x: args.startX, y: args.startY },
			{ x: p1x, y: p1y },
			{ x: p2x, y: p2y },
			{ x: args.endX, y: args.endY },
		),
	};
};

/** Sample position + tangent along a polyline by normalized arc length t∈[0,1]. */
export const sampleShotPath = (
	points: { x: number; y: number }[],
	t: number,
): { x: number; y: number; tx: number; ty: number } => {
	if (points.length === 0) return { x: 0, y: 0, tx: 1, ty: 0 };
	if (points.length === 1) return { x: points[0]!.x, y: points[0]!.y, tx: 1, ty: 0 };

	const lengths: number[] = [0];
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
		lengths.push(total);
	}
	if (total <= 0) {
		const p = points[points.length - 1]!;
		return { x: p.x, y: p.y, tx: 1, ty: 0 };
	}

	const target = Math.min(1, Math.max(0, t)) * total;
	let i = 1;
	while (i < lengths.length && lengths[i]! < target) i++;
	const i0 = Math.max(1, i) - 1;
	const i1 = Math.min(points.length - 1, i0 + 1);
	const segLen = lengths[i1]! - lengths[i0]!;
	const local = segLen > 0 ? (target - lengths[i0]!) / segLen : 0;
	const a = points[i0]!;
	const b = points[i1]!;
	const tx = b.x - a.x;
	const ty = b.y - a.y;
	const len = Math.hypot(tx, ty) || 1;
	return {
		x: a.x + (b.x - a.x) * local,
		y: a.y + (b.y - a.y) * local,
		tx: tx / len,
		ty: ty / len,
	};
};


/** Spine clips in `shot_bullet`. */
export const SHOT_BULLET_SPINE_ANIMS = ['bullet_idle', 'explosion', 'explosion_bullet'] as const;
export type ShotBulletSpineAnim = (typeof SHOT_BULLET_SPINE_ANIMS)[number];

/** Flight clip — bullet only (motion lines replaced by our SVG path). */
export const SHOT_BULLET_FLY_ANIM = 'bullet_idle' as const satisfies ShotBulletSpineAnim;
/** Impact clip — keeps the bullet for the first frames then bursts. */
export const SHOT_BULLET_IMPACT_ANIM = 'explosion_bullet' as const satisfies ShotBulletSpineAnim;

/** Slots for flight — bullet only (no Spine motion-line trail). */
export const SHOT_BULLET_FLY_SLOTS = ['bullet'] as const;

/** Slots for impact burst — no `bullet` (avoids tip teleport into new framing). */
export const SHOT_BULLET_IMPACT_SLOTS = [
	'explosion',
	'glow2',
	'halo_gold',
	'booster_glow_gold',
] as const;

/** @deprecated use FLY / IMPACT slot lists. */
export const SHOT_BULLET_VISIBLE_SLOTS = [
	...SHOT_BULLET_FLY_SLOTS,
	'glow',
	...SHOT_BULLET_IMPACT_SLOTS,
] as const;

/**
 * Hit jitter as a fraction of the seat size — keeps impacts on the disc but
 * not always dead-center.
 */
export const TARGET_SHOT_HIT_SPREAD_FRAC = 0.1;

/** Random offset inside a disc of radius `seatSize * TARGET_SHOT_HIT_SPREAD_FRAC`. */
export const randomTargetHitOffset = (seatSize: number) => {
	const radius = Math.max(4, seatSize * TARGET_SHOT_HIT_SPREAD_FRAC) * Math.sqrt(Math.random());
	const angle = Math.random() * Math.PI * 2;
	return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
};

/**
 * Shared framing for fly + impact so SpinePlayer does not reframe (and jump)
 * when switching `bullet_idle` → `explosion_bullet`.
 * Tip ~x=-27; motion lines ~−350; explosion/halo around root 0.
 */
export const SHOT_BULLET_FLY_VIEWPORT = {
	x: -480,
	y: -240,
	width: 640,
	height: 480,
	padLeft: '0%',
	padRight: '0%',
	padTop: '0%',
	padBottom: '0%',
} as const;

/** Same viewport for impact — avoids canvas remap on hit. */
export const SHOT_BULLET_IMPACT_VIEWPORT = SHOT_BULLET_FLY_VIEWPORT;

/** Skeleton X of the bullet tip (left edge of attachment × bone scale). */
export const SHOT_BULLET_FLY_TIP_X = -27.3;

/** Where the bullet tip sits inside the fly viewport (for path anchoring). */
export const SHOT_BULLET_FLY_ANCHOR = {
	x: (SHOT_BULLET_FLY_TIP_X - SHOT_BULLET_FLY_VIEWPORT.x) / SHOT_BULLET_FLY_VIEWPORT.width,
	y: 0.5,
} as const;

/** Explosion / root sits at skeleton (0,0) — pin this to the hit point. */
export const SHOT_BULLET_IMPACT_ANCHOR = {
	x: (0 - SHOT_BULLET_IMPACT_VIEWPORT.x) / SHOT_BULLET_IMPACT_VIEWPORT.width,
	y: 0.5,
} as const;

/** On-screen size — shared so hit does not shrink/jump the canvas. */
export const SHOT_BULLET_FLY_DISPLAY = { width: 400, height: 300 } as const;
export const SHOT_BULLET_IMPACT_DISPLAY = SHOT_BULLET_FLY_DISPLAY;

/** Flight payload shared by HTML (legacy) and Pixi tir FX layers. */
export type TargetShotFlight = {
	nonce: number;
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	/** Dense muzzle→seat samples from `buildTargetShotCurve`. */
	points: { x: number; y: number }[];
	/** Smooth cubic SVG / Graphics path. */
	svgPath?: string;
	flyMs?: number;
};

/**
 * Pixi transform: tip (fly) / root (impact) at local (0,0) after parent places
 * the container on the path sample. Matches spine-pixi Y-up → Y-down (mascot).
 */
export const getShotBulletPixiTransform = (
	display: { width: number; height: number } = SHOT_BULLET_FLY_DISPLAY,
) => {
	const vp = SHOT_BULLET_FLY_VIEWPORT;
	const scale = display.width / vp.width;
	const tipX = SHOT_BULLET_FLY_TIP_X;
	const tipY = 0;
	return {
		scale,
		/** Tip bone → container origin. */
		spineX: -tipX * scale,
		spineY: tipY * scale,
		/** Impact pins skeleton root (0,0) to the hit. */
		impactSpineX: 0,
		impactSpineY: 0,
	};
};

export const SHOT_BULLET_SPINE_FILES = [
	'shot_bullet.json',
	'shot_bullet.atlas',
	'shot_bullet.webp',
] as const;

export const SHOT_BULLET_SPINE_ASSET_URLS = SHOT_BULLET_SPINE_FILES.map(resolveShotBulletSpineUrl);

let shotBulletPreloadStarted = false;

export const startShotBulletPreload = () => {
	if (shotBulletPreloadStarted || typeof window === 'undefined') return;
	shotBulletPreloadStarted = true;
	const queue = [SHOT_BULLET_SPRITES.bullet, ...SHOT_BULLET_SPINE_ASSET_URLS];
	void Promise.all(
		queue.map(async (url) => {
			try {
				await fetch(url);
			} catch {
				/* best-effort */
			}
		}),
	);
};
