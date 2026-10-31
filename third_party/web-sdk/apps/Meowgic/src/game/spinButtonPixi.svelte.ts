/**
 * Spin button phases:
 *
 *   idle → (press) playing → pause on square → (reels done) finish clip → idle
 *
 * Autoplays: stay paused on the square for the whole autoplay session.
 * Finish → idle only when reels are quiet AND autoplay is off.
 */
import type { Spine } from '@esotericsoftware/spine-pixi-v8';

import {
	SPIN_BUTTON_SPIN_ANIMATION,
	SPIN_BUTTON_SQUARE_HOLD_TIME,
} from './spinButtonHtmlSpine';

type Phase = 'idle' | 'playing' | 'paused' | 'finishing';

let spine: Spine | undefined;
let phase: Phase = 'idle';
/** True after any reel left `stopped` this round. */
let sawReelMotion = false;
/** Rising-edge guard for autoplay starts (press path calls trigger directly). */
let wasCycleActive = false;

export const spinButtonDevMode = $state({ value: 'idle' as 'idle' | 'once' | 'loop' });
export const spinButtonPixiReady = $state({ value: false });
/** True while spine is playing/paused/finishing — HTML art hides only then (no appear flash). */
export const spinButtonSpineActive = $state({ value: false });
/** Mirrors HUD spinDisabled — dim HTML + Pixi whenever click/Space is a no-op. */
export const spinButtonDimmed = $state({ value: false });

const fullSpinDuration = (target: Spine) =>
	target.state.data.skeletonData.findAnimation(SPIN_BUTTON_SPIN_ANIMATION)?.duration ?? 1.6333333;

const setPhase = (next: Phase) => {
	phase = next;
	spinButtonSpineActive.value = next !== 'idle';
};

const applyIdlePose = (target: Spine) => {
	const state = target.state;
	const entry = state.setAnimation(0, SPIN_BUTTON_SPIN_ANIMATION, false);
	entry.loop = false;
	entry.mixDuration = 0;
	entry.trackTime = 0;
	entry.timeScale = 0;
	entry.animationEnd = fullSpinDuration(target);
	entry.listener = undefined;
	state.apply(target.skeleton);
	target.update(0);
	setPhase('idle');
	sawReelMotion = false;
};

/** Play `spin` only until the square hold frame, then pause. */
const playSpinToSquare = (target: Spine) => {
	const state = target.state;
	const entry = state.setAnimation(0, SPIN_BUTTON_SPIN_ANIMATION, false);
	entry.loop = false;
	entry.mixDuration = 0;
	entry.trackTime = 0;
	entry.timeScale = 1;
	entry.animationEnd = SPIN_BUTTON_SQUARE_HOLD_TIME;
	entry.listener = {
		complete: (e) => {
			e.timeScale = 0;
			e.trackTime = SPIN_BUTTON_SQUARE_HOLD_TIME;
			e.animationEnd = SPIN_BUTTON_SQUARE_HOLD_TIME;
			state.apply(target.skeleton);
			target.update(0);
			setPhase('paused');
		},
	};
	state.apply(target.skeleton);
	target.update(0);
	setPhase('playing');
};

/** From the square hold, play the rest of `spin`, then idle. */
const finishSpinThenIdle = (target: Spine) => {
	const state = target.state;
	const duration = fullSpinDuration(target);
	const entry = state.setAnimation(0, SPIN_BUTTON_SPIN_ANIMATION, false);
	entry.loop = false;
	entry.mixDuration = 0;
	entry.trackTime = SPIN_BUTTON_SQUARE_HOLD_TIME;
	entry.timeScale = 1;
	entry.animationEnd = duration;
	entry.listener = {
		complete: () => {
			applyIdlePose(target);
		},
	};
	state.apply(target.skeleton);
	target.update(0);
	setPhase('finishing');
};

/** Stop-press: freeze now (prefer square if already there). Settle still finishes → idle. */
export const pauseSpinButtonClip = () => {
	const target = spine;
	if (!target || phase === 'idle' || phase === 'finishing') return;
	const entry = target.state.tracks[0];
	if (!entry) return;
	if (entry.trackTime >= SPIN_BUTTON_SQUARE_HOLD_TIME) {
		entry.trackTime = SPIN_BUTTON_SQUARE_HOLD_TIME;
		entry.animationEnd = SPIN_BUTTON_SQUARE_HOLD_TIME;
	}
	entry.timeScale = 0;
	target.state.apply(target.skeleton);
	target.update(0);
	setPhase('paused');
};

export const registerSpinButtonSpine = (next: Spine | undefined) => {
	spine = next;
	spinButtonPixiReady.value = Boolean(next);
	sawReelMotion = false;
	wasCycleActive = false;
	if (next) {
		applyIdlePose(next);
	} else {
		setPhase('idle');
	}
};

export const triggerSpinButtonPress = () => {
	const target = spine;
	if (!target) return false;
	sawReelMotion = false;
	playSpinToSquare(target);
	return true;
};

export const playSpinButtonDev = (mode: 'once' | 'loop' | 'idle') => {
	spinButtonDevMode.value = mode;
	const target = spine;
	if (!target) return;
	sawReelMotion = false;
	wasCycleActive = false;
	if (mode === 'idle') {
		applyIdlePose(target);
		return;
	}
	if (mode === 'loop') {
		const state = target.state;
		const entry = state.setAnimation(0, SPIN_BUTTON_SPIN_ANIMATION, true);
		entry.loop = true;
		entry.mixDuration = 0;
		entry.timeScale = 1;
		entry.listener = undefined;
		state.apply(target.skeleton);
		setPhase('playing');
		return;
	}
	playSpinToSquare(target);
};

/**
 * - Rising pre-spin/reels while idle → start clip (autoplay first/follow-up)
 * - While autoplay on: hold square between spins — never finish/idle
 * - Finish → idle only when reels quiet AND autoplay off
 */
export const syncSpinButtonCycle = (input: {
	preSpin: boolean;
	reelsMoving: boolean;
	autoplayActive: boolean;
}) => {
	const target = spine;
	if (!target) return;

	const { preSpin, reelsMoving, autoplayActive } = input;
	const cycleActive = preSpin || reelsMoving;

	if (reelsMoving) {
		sawReelMotion = true;
	}

	// Start clip if idle (autoplay follow-up without playAnimation).
	if (cycleActive && !wasCycleActive && phase === 'idle') {
		playSpinToSquare(target);
	}
	wasCycleActive = cycleActive;

	if (cycleActive) {
		return;
	}

	// Autoplays still running — keep square hold between spins.
	if (autoplayActive) {
		return;
	}

	// Autoplays off + reels quiet → finish clip then idle.
	if (sawReelMotion && (phase === 'paused' || phase === 'playing')) {
		sawReelMotion = false;
		finishSpinThenIdle(target);
	}
};
