<!--
	Drives Super Wild Spine: play designer `open` (lying WILD tile = curtain
	foot → falls down / column opens up), then idle + wheel main16.
-->
<script lang="ts">
	import { getContextSpine } from 'pixi-svelte';

	import { gameSpeedMultFor } from '../game/gameSpeed';
	import { getContext } from '../game/context';
	import {
		SUPER_WILD_IDLE_ANIM,
		SUPER_WILD_OPEN_ANIM,
		SUPER_WILD_OPEN_MS,
		SUPER_WILD_OPEN_NATIVE_MS,
		SUPER_WILD_WHEEL_SECTORS,
		SUPER_WILD_WHEEL_SPIN_MS,
		superWildWheelEndDeg,
		superWildWheelStartDeg,
	} from '../game/superWildHtmlSpine';

	type Props = {
		/** Bumps to replay open for a new expand. */
		playKey: string | null;
		phase: 'expanding' | 'done' | null;
		mult: number;
		wheelDeg: number;
		wheelLanded: boolean;
		onWheelDeg: (deg: number) => void;
		onWheelLanded: (landed: boolean, sectorIndex: number, targetMult: number) => void;
	};

	const props: Props = $props();
	const spine = getContextSpine();
	const context = getContext();

	let playedKey = $state<string | null>(null);
	let pendingWheelMult = $state<number | null>(null);
	let wheelSpinning = $state(false);
	let wheelRaf = 0;
	let prevAfter: ((s: typeof spine) => void) | undefined;

	const speedMult = () => gameSpeedMultFor(context.stateGame.gameSpeed);

	/** Stretch native ~0.67s `open` to SUPER_WILD_OPEN_MS wall-clock (× game speed). */
	const openTimeScale = () =>
		(SUPER_WILD_OPEN_NATIVE_MS / SUPER_WILD_OPEN_MS) * Math.max(0.01, speedMult());

	const clearWheelRaf = () => {
		if (wheelRaf) cancelAnimationFrame(wheelRaf);
		wheelRaf = 0;
	};

	const applyWheelBone = (deg: number) => {
		const bone = spine.skeleton?.findBone('main16');
		if (!bone) return;
		bone.rotation = deg;
		bone.updateWorldTransform();
	};

	const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

	const holdIdlePose = () => {
		spine.state.timeScale = speedMult();
		const cur = spine.state.getCurrent(0)?.animation?.name;
		if (cur !== SUPER_WILD_IDLE_ANIM) {
			spine.state.setAnimation(0, SUPER_WILD_IDLE_ANIM, true);
			spine.update(0);
			spine.spineAttachmentsDirty = true;
		}
	};

	const startWheelSpin = (mult: number) => {
		clearWheelRaf();
		wheelSpinning = true;
		pendingWheelMult = null;
		const end = superWildWheelEndDeg(mult);
		const start = superWildWheelStartDeg(end);
		const sectors = SUPER_WILD_WHEEL_SECTORS as readonly number[];
		const sectorIndex = Math.max(0, sectors.indexOf(mult === 1 ? 2 : mult));
		props.onWheelLanded(false, sectorIndex, mult);
		props.onWheelDeg(start);
		applyWheelBone(start);
		const durationMs = SUPER_WILD_WHEEL_SPIN_MS / Math.max(0.01, speedMult());
		const t0 = performance.now();

		const tick = (now: number) => {
			const t = Math.min(1, (now - t0) / durationMs);
			const deg = start + (end - start) * easeOutCubic(t);
			props.onWheelDeg(deg);
			applyWheelBone(deg);
			if (t < 1) {
				wheelRaf = requestAnimationFrame(tick);
				return;
			}
			props.onWheelDeg(end);
			applyWheelBone(end);
			wheelSpinning = false;
			props.onWheelLanded(true, sectorIndex, mult);
			wheelRaf = 0;
		};
		wheelRaf = requestAnimationFrame(tick);
	};

	const finishOpen = (mult: number) => {
		spine.state.timeScale = speedMult();
		spine.state.setAnimation(0, SUPER_WILD_IDLE_ANIM, true);
		spine.update(0);
		spine.spineAttachmentsDirty = true;
		const m = pendingWheelMult ?? mult;
		if (!wheelSpinning) startWheelSpin(m);
	};

	/**
	 * Designer `open`: frame-0 lying WILD is the curtain foot (replaces board SW).
	 * Tile falls to the column bottom while the rest of the curtain opens upward.
	 */
	const playOpen = (key: string, mult: number) => {
		pendingWheelMult = mult;
		wheelSpinning = false;
		clearWheelRaf();
		props.onWheelLanded(false, 0, mult);
		const startDeg = superWildWheelStartDeg(superWildWheelEndDeg(mult));
		props.onWheelDeg(startDeg);
		applyWheelBone(startDeg);

		spine.state.timeScale = openTimeScale();
		const entry = spine.state.setAnimation(0, SUPER_WILD_OPEN_ANIM, false);
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

	const holdIdle = (mult: number) => {
		holdIdlePose();
		if (!wheelSpinning && !props.wheelLanded && pendingWheelMult == null) {
			const sectors = SUPER_WILD_WHEEL_SECTORS as readonly number[];
			const sectorIndex = Math.max(0, sectors.indexOf(mult === 1 ? 2 : mult));
			const deg = superWildWheelEndDeg(mult);
			props.onWheelDeg(deg);
			applyWheelBone(deg);
			props.onWheelLanded(true, sectorIndex, mult);
		}
	};

	$effect(() => {
		prevAfter = spine.afterUpdateWorldTransforms;
		spine.afterUpdateWorldTransforms = (s) => {
			prevAfter?.(s);
			if (wheelSpinning || props.wheelLanded || pendingWheelMult != null) {
				applyWheelBone(props.wheelDeg);
			}
		};
		return () => {
			clearWheelRaf();
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
			wheelSpinning = false;
			clearWheelRaf();
			return;
		}

		if (phase === 'expanding' && playedKey !== key) {
			playOpen(key, mult);
			return;
		}

		if (phase === 'done') {
			holdIdle(mult);
		}
	});
</script>
