<!--
	Drives Super Wild Spine:
	1) `open` — lying WILD foot falls / curtain opens up
	2) `win` — cat winds the drum (wheel bone held still at first)
	3) ~mid-win → programmatic main16 spin → math mult (cat clip keeps playing)
	4) `idle`
-->
<script lang="ts">
	import { getContextSpine } from 'pixi-svelte';

	import {
		SUPER_WILD_IDLE_ANIM,
		SUPER_WILD_OPEN_ANIM,
		SUPER_WILD_OPEN_MS,
		SUPER_WILD_OPEN_NATIVE_MS,
		SUPER_WILD_POINTER_SCALE,
		SUPER_WILD_POINTER_SHAKE_DEG,
		SUPER_WILD_POINTER_SHAKE_HZ,
		SUPER_WILD_POINTER_Y_NUDGE,
		SUPER_WILD_STICKY_DROP_IN_MS,
		SUPER_WILD_WHEEL_SECTORS,
		SUPER_WILD_WHEEL_SPIN_MS,
		SUPER_WILD_WIN_ANIM,
		SUPER_WILD_WIN_MS,
		SUPER_WILD_WIN_NATIVE_MS,
		SUPER_WILD_WIN_WHEEL_START_FRAC,
		superWildWheelEndDeg,
		superWildWheelStartDeg,
	} from '../game/superWildHtmlSpine';

	type Props = {
		/** Bumps to replay open for a new expand. */
		playKey: string | null;
		phase: 'expanding' | 'dropIn' | 'dismiss' | 'done' | null;
		mult: number;
		wheelDeg: number;
		wheelLanded: boolean;
		onWheelDeg: (deg: number) => void;
		onWheelLanded: (landed: boolean, sectorIndex: number, targetMult: number) => void;
		/** Fires when Spine `open` completes — snap column align. */
		onOpenComplete?: () => void;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	let playedKey = $state<string | null>(null);
	let pendingWheelMult = $state<number | null>(null);
	/** Cat `win` clip playing — drum held at startDeg until mid-clip spin. */
	let catWinding = $state(false);
	let wheelSpinning = $state(false);
	/** 0→1 progress through drum spin (matches easeOutCubic wall clock). */
	let wheelSpinT = 0;
	/** Accumulated shake phase (rad) — advances slower as the wheel eases out. */
	let pointerShakePhase = 0;
	let pointerShakeLastMs = 0;
	/** True while designer `open` is on track 0. */
	let opening = $state(false);
	/** Guard so complete-listener + early-land don't double-fire win. */
	let openFinished = false;
	let wheelRaf = 0;
	let wheelStartTimer: ReturnType<typeof setTimeout> | undefined;
	let prevAfter: ((s: typeof spine) => void) | undefined;

	/**
	 * Designer `open` overshoots then springs back (bounce) in the last ~15%.
	 * After the foot has fallen, snap to the final open pose and cut into `win`
	 * — do NOT clamp bones mid-flight (that broke the fall / slid the tile).
	 * Native open duration ≈ 0.6667s; peak overshoot ≈ 0.33s.
	 */
	const OPEN_LAND_BEFORE_BOUNCE = 0.55;

	/**
	 * Curtain Spine + drum always run at 1× — turbo must not shorten open/win/spin
	 * (same rule as mascot). Wall-clock constants below are absolute.
	 */
	/** Stretch native ~0.67s `open` to SUPER_WILD_OPEN_MS wall-clock. */
	const openTimeScale = () => SUPER_WILD_OPEN_NATIVE_MS / SUPER_WILD_OPEN_MS;

	/** Stretch designer `win` (cat winds drum) to SUPER_WILD_WIN_MS. */
	const winTimeScale = () => SUPER_WILD_WIN_NATIVE_MS / SUPER_WILD_WIN_MS;

	const clearWheelStartTimer = () => {
		if (wheelStartTimer !== undefined) {
			clearTimeout(wheelStartTimer);
			wheelStartTimer = undefined;
		}
	};

	const clearWheelRaf = () => {
		if (wheelRaf) cancelAnimationFrame(wheelRaf);
		wheelRaf = 0;
	};

	const clearAllTimers = () => {
		clearWheelRaf();
		clearWheelStartTimer();
	};

	const applyWheelBone = (deg: number) => {
		const bone = spine.skeleton?.findBone('main16');
		if (!bone) return;
		bone.rotation = deg;
		bone.updateWorldTransform();
	};

	/**
	 * Apply pointer tune from authored setup (NOT per-frame for y/scale).
	 * Idle/win leave main17 unkeyed — per-frame `+=` / `*=` would stack.
	 * Always derive from the Spine JSON setup so HMR / prior mutates don't drift.
	 */
	const POINTER_SETUP = { y: -1780.92, scaleX: 1, scaleY: 1, rotation: -90.29 } as const;
	const ensurePointerTune = () => {
		const bone = spine.skeleton?.findBone('main17');
		const data = bone?.data;
		if (!bone || !data) return;
		data.y = POINTER_SETUP.y + SUPER_WILD_POINTER_Y_NUDGE;
		data.scaleX = POINTER_SETUP.scaleX * SUPER_WILD_POINTER_SCALE;
		data.scaleY = POINTER_SETUP.scaleY * SUPER_WILD_POINTER_SCALE;
		data.rotation = POINTER_SETUP.rotation;
		bone.y = data.y;
		bone.scaleX = data.scaleX;
		bone.scaleY = data.scaleY;
		bone.rotation = data.rotation;
	};

	/**
	 * Override Spine `win` pointer keys. Shake only while the drum spins;
	 * frequency + amplitude follow easeOut speed (fast at start, slow to stop).
	 */
	const applyPointerRotation = (s: typeof spine, spinning: boolean) => {
		const bone = s.skeleton?.findBone('main17');
		if (!bone) return;
		let kick = 0;
		if (spinning && SUPER_WILD_POINTER_SHAKE_DEG > 0) {
			const now = performance.now();
			const dt = pointerShakeLastMs ? Math.min(0.05, (now - pointerShakeLastMs) / 1000) : 0;
			pointerShakeLastMs = now;
			// Softer than easeOutCubic' (1-t)^2 — shake decelerates more gradually.
			const speed = Math.max(0, 1 - wheelSpinT) ** 0.75;
			pointerShakePhase += dt * Math.PI * 2 * SUPER_WILD_POINTER_SHAKE_HZ * speed;
			kick = SUPER_WILD_POINTER_SHAKE_DEG * speed * Math.sin(pointerShakePhase);
		} else {
			pointerShakeLastMs = 0;
		}
		bone.rotation = POINTER_SETUP.rotation + kick;
		bone.updateWorldTransform();
	};

	const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

	const holdIdlePose = () => {
		spine.state.timeScale = 1;
		const cur = spine.state.getCurrent(0)?.animation?.name;
		if (cur !== SUPER_WILD_IDLE_ANIM) {
			spine.state.setAnimation(0, SUPER_WILD_IDLE_ANIM, true);
			spine.update(0);
			spine.spineAttachmentsDirty = true;
		}
	};

	const startWheelSpin = (mult: number) => {
		clearWheelRaf();
		clearWheelStartTimer();
		catWinding = false;
		wheelSpinning = true;
		wheelSpinT = 0;
		pointerShakePhase = 0;
		pointerShakeLastMs = 0;
		pendingWheelMult = null;
		const end = superWildWheelEndDeg(mult);
		const start = superWildWheelStartDeg(end);
		const sectors = SUPER_WILD_WHEEL_SECTORS as readonly number[];
		const sectorIndex = Math.max(0, sectors.indexOf(mult === 1 ? 2 : mult));
		props.onWheelLanded(false, sectorIndex, mult);
		props.onWheelDeg(start);
		applyWheelBone(start);
		// Let `win` keep playing through the rest of the gesture while we drive the drum.
		const durationMs = SUPER_WILD_WHEEL_SPIN_MS;
		const t0 = performance.now();

		const tick = (now: number) => {
			const t = Math.min(1, (now - t0) / durationMs);
			wheelSpinT = t;
			const deg = start + (end - start) * easeOutCubic(t);
			props.onWheelDeg(deg);
			applyWheelBone(deg);
			if (t < 1) {
				wheelRaf = requestAnimationFrame(tick);
				return;
			}
			props.onWheelDeg(end);
			applyWheelBone(end);
			wheelSpinT = 1;
			wheelSpinning = false;
			props.onWheelLanded(true, sectorIndex, mult);
			wheelRaf = 0;
			holdIdlePose();
		};
		wheelRaf = requestAnimationFrame(tick);
	};

	/**
	 * After curtain open: play designer `win` with the wheel frozen, then kick
	 * the mult drum spin around mid-clip so it overlaps the rest of the cat gesture.
	 */
	const finishOpen = (mult: number) => {
		if (openFinished) return;
		openFinished = true;
		opening = false;
		props.onOpenComplete?.();
		const m = pendingWheelMult ?? mult;
		const startDeg = superWildWheelStartDeg(superWildWheelEndDeg(m));
		props.onWheelDeg(startDeg);
		applyWheelBone(startDeg);

		catWinding = true;
		wheelSpinning = false;
		clearWheelStartTimer();
		spine.state.timeScale = winTimeScale();
		spine.state.clearTracks();
		const winEntry = spine.state.setAnimation(0, SUPER_WILD_WIN_ANIM, false);
		if (winEntry) winEntry.mixDuration = 0;
		spine.update(0);
		spine.spineAttachmentsDirty = true;
		applyWheelBone(startDeg);

		const delayMs = SUPER_WILD_WIN_MS * SUPER_WILD_WIN_WHEEL_START_FRAC;
		wheelStartTimer = setTimeout(() => {
			wheelStartTimer = undefined;
			if (!catWinding) return;
			startWheelSpin(m);
		}, delayMs);
	};

	/**
	 * Designer `open`: frame-0 lying WILD is the curtain foot (replaces board SW).
	 * Tile falls to the column bottom while the rest of the curtain opens upward.
	 * Play the fall as authored — no mid-flight bone clamps.
	 */
	const playOpen = (key: string, mult: number) => {
		pendingWheelMult = mult;
		catWinding = false;
		wheelSpinning = false;
		opening = true;
		openFinished = false;
		clearAllTimers();
		props.onWheelLanded(false, 0, mult);
		const startDeg = superWildWheelStartDeg(superWildWheelEndDeg(mult));
		props.onWheelDeg(startDeg);
		applyWheelBone(startDeg);

		spine.state.timeScale = openTimeScale();
		spine.state.clearTracks();
		const entry = spine.state.setAnimation(0, SUPER_WILD_OPEN_ANIM, false);
		if (entry) {
			entry.mixDuration = 0;
			entry.trackTime = 0;
		}
		spine.update(0);
		spine.spineAttachmentsDirty = true;
		if (entry) {
			entry.listener = {
				complete: () => {
					finishOpen(mult);
				},
			};
		} else {
			finishOpen(mult);
		}

		playedKey = key;
	};

	/**
	 * Super intro: curtain is already open (idle). Park from above, then same
	 * cat `win` + drum spin as after a normal expand — × only after land.
	 */
	const playDropInThenSpin = (key: string, mult: number) => {
		pendingWheelMult = mult;
		catWinding = false;
		wheelSpinning = false;
		opening = false;
		// Allow finishOpen after drop-in (same guard as expand complete).
		openFinished = false;
		clearAllTimers();
		props.onWheelLanded(false, 0, mult);
		const startDeg = superWildWheelStartDeg(superWildWheelEndDeg(mult));
		props.onWheelDeg(startDeg);
		holdIdlePose();
		applyWheelBone(startDeg);

		const delayMs = SUPER_WILD_STICKY_DROP_IN_MS;
		wheelStartTimer = setTimeout(() => {
			wheelStartTimer = undefined;
			finishOpen(mult);
		}, delayMs);

		playedKey = key;
	};

	const holdIdle = (mult: number) => {
		// Don't interrupt cat wind-up or drum land.
		if (catWinding || wheelSpinning) return;
		holdIdlePose();
		if (!props.wheelLanded && pendingWheelMult == null) {
			const sectors = SUPER_WILD_WHEEL_SECTORS as readonly number[];
			const sectorIndex = Math.max(0, sectors.indexOf(mult === 1 ? 2 : mult));
			const deg = superWildWheelEndDeg(mult);
			props.onWheelDeg(deg);
			applyWheelBone(deg);
			props.onWheelLanded(true, sectorIndex, mult);
		}
	};

	$effect(() => {
		ensurePointerTune();
		prevAfter = spine.afterUpdateWorldTransforms;
		spine.afterUpdateWorldTransforms = (s) => {
			prevAfter?.(s);
			// Skip designer end-bounce: after the fall, jump to final open pose → win.
			// Defer finishOpen — never mutate AnimationState inside afterUpdate.
			if (opening && !openFinished) {
				const entry = s.state?.getCurrent?.(0);
				if (
					entry?.animation?.name === SUPER_WILD_OPEN_ANIM &&
					(entry.trackTime ?? 0) >= OPEN_LAND_BEFORE_BOUNCE
				) {
					const end = entry.animationEnd ?? entry.animation?.duration ?? OPEN_LAND_BEFORE_BOUNCE;
					entry.trackTime = end;
					const m = pendingWheelMult ?? props.mult;
					queueMicrotask(() => finishOpen(m));
				}
			}
			// Freeze drum during early cat wind-up; drive it during/after our spin.
			if (catWinding || wheelSpinning || props.wheelLanded || pendingWheelMult != null) {
				applyWheelBone(props.wheelDeg);
			}
			// Replace Spine `win` shake with a plain spin-time wiggle.
			applyPointerRotation(s, wheelSpinning);
		};
		return () => {
			clearAllTimers();
			opening = false;
			spine.afterUpdateWorldTransforms = prevAfter ?? (() => {});
		};
	});

	$effect(() => {
		const key = props.playKey;
		const phase = props.phase;
		const mult = props.mult;

		if (!key || !phase) {
			playedKey = null;
			pendingWheelMult = null;
			catWinding = false;
			wheelSpinning = false;
			opening = false;
			openFinished = false;
			clearAllTimers();
			return;
		}

		if (phase === 'expanding' && playedKey !== key) {
			playOpen(key, mult);
			return;
		}

		if (phase === 'dropIn' && playedKey !== key) {
			playDropInThenSpin(key, mult);
			return;
		}

		// Settled sticky / base dismiss: already-open idle (× already known).
		// Do NOT holdIdle on dropIn — that would flash the landed × immediately.
		if (phase === 'done' || phase === 'dismiss') {
			opening = false;
			holdIdle(mult);
		}
	});
</script>
