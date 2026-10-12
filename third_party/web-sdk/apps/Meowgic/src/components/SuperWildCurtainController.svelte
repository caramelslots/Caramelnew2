<!--
	Drives Super Wild Spine:
	1) `open` — full clip (fall + bounce); column align settles when the foot lands
	2) `idle` — living curtain after bounce
	3) `win` — cat winds the drum (wheel bone held still at first)
	4) ~mid-win → programmatic main16 spin → math mult (cat clip keeps playing)
	5) `idle` after the drum lands (× badge pinned)
	6) `activation` — thumb-up when a payline reaches this column
	7) `idle`
-->
<script lang="ts" module>
	export type EmitterEventSuperWildCurtain = {
		type: 'superWildCurtainActivate';
		/** Curtain reels whose columns the active paylines cross. */
		reels: number[];
		/** Duel desk filter — omit for base / FS board. */
		side?: 'cat' | 'dog';
	};
</script>

<script lang="ts">
	import { getContextSpine } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { BOARD_DIMENSIONS, PAYLINE_DRAW_DURATION_MS } from '../game/constants';
	import type { DuelSide } from '../game/stateDuel.svelte';
	import {
		SUPER_WILD_ACTIVATION_ANIM,
		SUPER_WILD_IDLE_ANIM,
		SUPER_WILD_OPEN_ANIM,
		SUPER_WILD_OPEN_END_NATIVE_MS,
		SUPER_WILD_OPEN_IDLE_MS,
		SUPER_WILD_OPEN_LAND_MS,
		SUPER_WILD_OPEN_LAND_NATIVE_MS,
		SUPER_WILD_POINTER_SCALE,
		SUPER_WILD_POINTER_SHAKE_DEG,
		SUPER_WILD_POINTER_SHAKE_HZ,
		SUPER_WILD_POINTER_Y_NUDGE,
		SUPER_WILD_STICKY_DROP_IN_MS,
		SUPER_WILD_WHEEL_SPIN_MS,
		SUPER_WILD_WIN_ANIM,
		SUPER_WILD_WIN_HAND_ABOVE_WHEEL_NATIVE_MS,
		SUPER_WILD_WIN_MS,
		SUPER_WILD_WIN_NATIVE_MS,
		SUPER_WILD_WIN_WHEEL_START_FRAC,
		superWildWheelEndDeg,
		superWildWheelSectorIndex,
		superWildWheelStartDeg,
		prepareSuperWildDrumSpin,
	} from '../game/superWildHtmlSpine';

	type Props = {
		/** Bumps to replay open for a new expand. */
		playKey: string | null;
		phase: 'expanding' | 'dropIn' | 'dismiss' | 'done' | null;
		mult: number;
		/** Board reel this curtain owns (0-based). */
		reel: number;
		/** Duel desk — omit for base / FS. */
		duelSide?: DuelSide;
		wheelDeg: number;
		wheelLanded: boolean;
		onWheelDeg: (deg: number) => void;
		onWheelLanded: (landed: boolean, sectorIndex: number, targetMult: number, labels?: number[]) => void;
		/** Fires when Spine `open` completes — snap column align. */
		onOpenComplete?: () => void;
	};

	const props: Props = $props();
	const spine = getContextSpine();
	const context = getContext();

	let playedKey = $state<string | null>(null);
	let pendingWheelMult = $state<number | null>(null);
	/** Cat `win` clip playing — drum held at startDeg until mid-clip spin. */
	let catWinding = $state(false);
	let wheelSpinning = $state(false);
	/** Thumb-up `activation` while a payline crosses this column. */
	let activating = $state(false);
	/** 0→1 progress through drum spin (matches easeOutCubic wall clock). */
	let wheelSpinT = 0;
	/** Accumulated shake phase (rad) — advances slower as the wheel eases out. */
	let pointerShakePhase = 0;
	let pointerShakeLastMs = 0;
	/** True while designer `open` is on track 0. */
	let opening = $state(false);
	/** Guard so complete-listener + idle-hold don't double-fire win. */
	let openFinished = false;
	/** Foot landed — restore 1× so the rest of `open` (bounce) plays in full. */
	let openLanded = false;
	/** Full `open` finished — living idle is on, `win` is scheduled. */
	let openIdleStarted = false;
	let wheelRaf = 0;
	let wheelStartTimer: ReturnType<typeof setTimeout> | undefined;
	let activationTimer: ReturnType<typeof setTimeout> | undefined;
	let prevAfter: ((s: typeof spine) => void) | undefined;

	/**
	 * Curtain Spine + drum always run at 1× — turbo must not shorten open/win/spin
	 * (same rule as mascot). Wall-clock constants below are absolute.
	 */
	/** Stretch only the fall to SUPER_WILD_OPEN_LAND_MS; bounce + rest of `open` stay 1×. */
	const openFallTimeScale = () => SUPER_WILD_OPEN_LAND_NATIVE_MS / SUPER_WILD_OPEN_LAND_MS;
	const OPEN_LAND_NATIVE_S = SUPER_WILD_OPEN_LAND_NATIVE_MS / 1000;
	const OPEN_END_NATIVE_S = SUPER_WILD_OPEN_END_NATIVE_MS / 1000;

	/** Stretch designer `win` (cat winds drum) to SUPER_WILD_WIN_MS. */
	const winTimeScale = () => SUPER_WILD_WIN_NATIVE_MS / SUPER_WILD_WIN_MS;

	const clearWheelStartTimer = () => {
		if (wheelStartTimer !== undefined) {
			clearTimeout(wheelStartTimer);
			wheelStartTimer = undefined;
		}
	};

	const clearActivationTimer = () => {
		if (activationTimer !== undefined) {
			clearTimeout(activationTimer);
			activationTimer = undefined;
		}
	};

	const clearWheelRaf = () => {
		if (wheelRaf) cancelAnimationFrame(wheelRaf);
		wheelRaf = 0;
	};

	const clearAllTimers = () => {
		clearWheelRaf();
		clearWheelStartTimer();
		clearActivationTimer();
	};

	const applyWheelBone = (deg: number) => {
		const bone = spine.skeleton?.findBone('main16');
		if (!bone) return;
		bone.rotation = deg;
		bone.updateWorldTransform();
	};

	/**
	 * Grabbing hand above the drum only during the reach (`win`).
	 * Once the programmatic spin starts (and after land), the hand sits under
	 * the disk again — we mutate `drawOrder` every frame while grabbing, so
	 * we must restore under-wheel order or the hand stays stuck on top.
	 */
	const FRONT_HAND_SLOTS = new Set([
		'finger',
		'wrist1',
		'wrist2',
		'shoulder1',
		'shoulder2',
		'forearm1',
		'forearm2',
	]);
	/**
	 * Idle-mix / settled flash of sunburst + green glows behind the cat when
	 * the × badge pins. Keep authored VFX during `win`, drum spin, and
	 * payline `activation` (👍).
	 */
	const SUPPRESS_BEHIND_CAT_GLOW_SLOTS = [
		'Circle_rays_22',
		'glow_green5',
		'glow_green6',
		'glow_green7',
		'glow_green8',
		'WILD_glow',
		'WILD_glow copy',
		'WILD_glow copy 2',
		'WILD_glow copy 3',
	] as const;
	const HAND_ABOVE_WHEEL_NATIVE_S = SUPER_WILD_WIN_HAND_ABOVE_WHEEL_NATIVE_MS / 1000;

	/** Hide settled/idle ray flash only — allow win + wheel spin + activation. */
	const suppressBehindCatGlow = () => {
		if (activating || catWinding || wheelSpinning) return;
		const skeleton = spine.skeleton;
		if (!skeleton) return;
		for (const name of SUPPRESS_BEHIND_CAT_GLOW_SLOTS) {
			const slot = skeleton.findSlot(name);
			if (slot) slot.color.a = 0;
		}
		const vfx = skeleton.findBone('vfx');
		if (vfx) {
			vfx.scaleX = 1e-5;
			vfx.scaleY = 1e-5;
		}
	};

	const applyHandWheelDrawOrder = () => {
		const skeleton = spine.skeleton;
		if (!skeleton) return;

		// Above only while the cat is still winding / grabbing the rim.
		let handsAbove = false;
		if (catWinding) {
			const entry = spine.state?.getCurrent?.(0);
			if (
				entry?.animation?.name === SUPER_WILD_WIN_ANIM &&
				(entry.trackTime ?? 0) >= HAND_ABOVE_WHEEL_NATIVE_S
			) {
				handsAbove = true;
			}
		} else if (!wheelSpinning && !props.wheelLanded && pendingWheelMult == null) {
			// Pre-open / unset — leave Spine's authored order alone.
			return;
		}
		// wheelSpinning / landed idle / activation → hands under the disk.

		const { slots, drawOrder } = skeleton;
		const n = slots.length;
		const hands: (typeof slots)[number][] = [];
		const rest: (typeof slots)[number][] = [];
		for (let i = 0; i < n; i++) {
			const slot = slots[i];
			if (FRONT_HAND_SLOTS.has(slot.data.name)) hands.push(slot);
			else rest.push(slot);
		}

		// Setup order: hand slots → wheel → wheel2 → arch. Grab = after wheel;
		// spin + settled = before wheel (under the disk, still under arch).
		let insertAt = -1;
		if (handsAbove) {
			for (let i = 0; i < rest.length; i++) {
				const name = rest[i].data.name;
				if (name === 'wheel' || name === 'wheel2') insertAt = i + 1;
			}
			if (insertAt < 0) insertAt = rest.length;
		} else {
			for (let i = 0; i < rest.length; i++) {
				const name = rest[i].data.name;
				if (name === 'wheel' || name === 'wheel2') {
					insertAt = i;
					break;
				}
			}
			if (insertAt < 0) insertAt = rest.length;
		}

		let o = 0;
		for (let i = 0; i < insertAt; i++) drawOrder[o++] = rest[i];
		for (let i = 0; i < hands.length; i++) drawOrder[o++] = hands[i];
		for (let i = insertAt; i < rest.length; i++) drawOrder[o++] = rest[i];
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

	const holdIdlePose = (mixDuration = 0) => {
		spine.state.timeScale = 1;
		const cur = spine.state.getCurrent(0)?.animation?.name;
		if (cur !== SUPER_WILD_IDLE_ANIM) {
			const idleEntry = spine.state.setAnimation(0, SUPER_WILD_IDLE_ANIM, true);
			if (idleEntry) idleEntry.mixDuration = mixDuration;
			spine.update(0);
			spine.spineAttachmentsDirty = true;
		}
	};

	/** Finger like when the payline reaches this column — then living idle. */
	const playActivationThenIdle = () => {
		// Never interrupt open / drum sequence; dismiss owns the slide-out.
		if (opening || catWinding || wheelSpinning || props.phase === 'dismiss') return;
		activating = true;
		spine.state.timeScale = 1;
		const entry = spine.state.setAnimation(0, SUPER_WILD_ACTIVATION_ANIM, false);
		if (entry) entry.mixDuration = 0.2;
		spine.spineAttachmentsDirty = true;
		if (entry) {
			entry.listener = {
				complete: () => {
					activating = false;
					holdIdlePose(0.2);
				},
			};
		} else {
			activating = false;
			holdIdlePose();
		}
	};

	/**
	 * Schedule thumb-up so it starts when the payline draw reaches this reel
	 * (left→right arc-length progress ≈ reel / (cols-1)).
	 */
	const scheduleActivationForPayline = () => {
		if (opening || catWinding || wheelSpinning || props.phase === 'dismiss') return;
		clearActivationTimer();
		const span = Math.max(1, BOARD_DIMENSIONS.x - 1);
		const delayMs = (props.reel / span) * PAYLINE_DRAW_DURATION_MS;
		if (delayMs <= 0) {
			playActivationThenIdle();
			return;
		}
		activationTimer = setTimeout(() => {
			activationTimer = undefined;
			playActivationThenIdle();
		}, delayMs);
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
		const targetMult = Math.round(mult);
		const { labels, landSectorIndex, endDeg: end, startDeg: start } =
			prepareSuperWildDrumSpin(targetMult);
		props.onWheelLanded(false, landSectorIndex, targetMult, labels);
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
			props.onWheelLanded(true, landSectorIndex, targetMult);
			wheelRaf = 0;
			// Thumb-up waits for payline×curtain — settle on living idle here.
			holdIdlePose(0.2);
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
		const winEntry = spine.state.setAnimation(0, SUPER_WILD_WIN_ANIM, false);
		if (winEntry) winEntry.mixDuration = 0.2;
		spine.spineAttachmentsDirty = true;
		applyWheelBone(startDeg);

		const delayMs = SUPER_WILD_WIN_MS * SUPER_WILD_WIN_WHEEL_START_FRAC;
		wheelStartTimer = setTimeout(() => {
			wheelStartTimer = undefined;
			if (!catWinding) return;
			startWheelSpin(m);
		}, delayMs);
	};

	/** Full `open` (including bounce) is done — living idle, then `win`. */
	const playIdleThenWin = (mult: number) => {
		if (openIdleStarted || openFinished) return;
		openIdleStarted = true;
		opening = false;
		holdIdlePose(0.2);
		props.onOpenComplete?.();
		clearWheelStartTimer();
		if (SUPER_WILD_OPEN_IDLE_MS <= 0) {
			finishOpen(mult);
			return;
		}
		wheelStartTimer = setTimeout(() => {
			wheelStartTimer = undefined;
			finishOpen(mult);
		}, SUPER_WILD_OPEN_IDLE_MS);
	};

	/**
	 * Designer `open`: frame-0 lying WILD is the curtain foot (replaces board SW).
	 * Tile falls to the column bottom while the rest of the curtain opens upward.
	 * Play the whole clip — bounce lives in the tail; idle starts after complete.
	 */
	const playOpen = (key: string, mult: number) => {
		pendingWheelMult = mult;
		catWinding = false;
		wheelSpinning = false;
		activating = false;
		opening = true;
		openFinished = false;
		openLanded = false;
		openIdleStarted = false;
		clearAllTimers();
		props.onWheelLanded(false, 0, mult);
		const startDeg = superWildWheelStartDeg(superWildWheelEndDeg(mult));
		props.onWheelDeg(startDeg);
		applyWheelBone(startDeg);

		spine.state.timeScale = openFallTimeScale();
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
					playIdleThenWin(mult);
				},
			};
		} else {
			playIdleThenWin(mult);
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
		activating = false;
		opening = false;
		// Allow finishOpen after drop-in (same guard as expand complete).
		openFinished = false;
		openLanded = false;
		openIdleStarted = false;
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
		// Don't interrupt cat wind-up, drum land, or thumb-up gesture.
		if (catWinding || wheelSpinning || activating) return;
		holdIdlePose();
		if (!props.wheelLanded && pendingWheelMult == null) {
			const sectorIndex = superWildWheelSectorIndex(mult);
			const deg = superWildWheelEndDeg(mult);
			props.onWheelDeg(deg);
			applyWheelBone(deg);
			props.onWheelLanded(true, sectorIndex, mult);
		}
	};

	context.eventEmitter.subscribeOnMount({
		superWildCurtainActivate: (event) => {
			if (props.duelSide) {
				if (event.side !== props.duelSide) return;
			} else if (event.side) {
				return;
			}
			if (!event.reels.includes(props.reel)) return;
			scheduleActivationForPayline();
		},
		paylineClearAll: (event) => {
			const side = event && 'side' in event ? event.side : undefined;
			if (props.duelSide) {
				if (side !== props.duelSide) return;
			} else if (side) {
				return;
			}
			// Lines gone before the draw reached this column — skip the pending like.
			clearActivationTimer();
		},
	});

	$effect(() => {
		ensurePointerTune();
		prevAfter = spine.afterUpdateWorldTransforms;
		spine.afterUpdateWorldTransforms = (s) => {
			prevAfter?.(s);
			if (opening && !openFinished && !openIdleStarted) {
				const entry = s.state?.getCurrent?.(0);
				if (entry?.animation?.name === SUPER_WILD_OPEN_ANIM) {
					const trackTime = entry.trackTime ?? 0;
					// Fall is stretched; restore 1× for the authored bounce / tail.
					// Do not interrupt `open` — idle starts on complete.
					if (trackTime >= OPEN_LAND_NATIVE_S && !openLanded) {
						openLanded = true;
						s.state.timeScale = 1;
						queueMicrotask(() => props.onOpenComplete?.());
					}
					// Skip the ~1s empty tail of `open` — bounce is already done.
					if (trackTime >= OPEN_END_NATIVE_S) {
						const m = pendingWheelMult ?? props.mult;
						queueMicrotask(() => playIdleThenWin(m));
					}
				}
			}
			// Freeze drum during early cat wind-up; drive it during/after our spin.
			if (catWinding || wheelSpinning || props.wheelLanded || pendingWheelMult != null) {
				applyWheelBone(props.wheelDeg);
			}
			// Grab reach: hands over wheel. Spin + land: hands under the disk.
			applyHandWheelDrawOrder();
			// Replace Spine `win` shake with a plain spin-time wiggle.
			applyPointerRotation(s, wheelSpinning);
			// After anim apply — hide win/idle sunburst behind the cat (not activation).
			suppressBehindCatGlow();
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
			activating = false;
			opening = false;
			openFinished = false;
			openLanded = false;
			openIdleStarted = false;
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
