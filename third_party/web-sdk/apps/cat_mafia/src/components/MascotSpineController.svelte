<!--
	Imperative pose / idle-flavour controller for the Pixi mascotCat spine.
	Mirrors the former HTML SpinePlayer logic in MascotPlaceholder.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import {
		MASCOT_COIN_FLY_WAIT_MS,
		MASCOT_HAT_DURATION_S,
		MASCOT_HAT_HOLD_TIME_S,
		MASCOT_IDLE_VARIANTS,
		MASCOT_POSE_PLAYBACK,
		nextMascotIdleVariantDelayMs,
		pickMascotIdleVariant,
		type MascotDevPreview,
		type MascotPose,
		type MascotSpineAnimation,
	} from '../game/mascotHtmlSpine';

	type Props = {
		pose: MascotPose;
		forceAnim: MascotDevPreview | null;
		timeScale: number;
		/** Bump to re-apply the same one-shot pose. */
		animToken?: number;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	let ready = $state(false);
	let activePose: MascotPose | undefined;
	let activeForceAnim: MascotDevPreview | null | undefined;
	let lastAnimToken = -1;
	let idleVariantTimer: ReturnType<typeof setTimeout> | undefined;
	let idleVariantArmed = false;
	let idleVariantPlaying = false;
	let forceIdle3Phase: 'catch' | 'hold' | 'on' | null = null;
	let forceIdle3HoldTimer: ReturnType<typeof setTimeout> | undefined;
	/** Win like/applause already played for this pose — don't restart after idle return. */
	let settledWinReaction: MascotPose | undefined;

	const hideSmileSlot = () => {
		const skeleton = spine.skeleton;
		if (!skeleton) return;
		try {
			skeleton.setAttachment('smile', null);
		} catch {
			skeleton.findSlot('smile')?.setAttachment(null);
		}
	};

	/** Spine `gun_start` embeds a cartridge @~0.73s — hide it; Pixi fly owns the bullet. */
	const hideGunStartCartridge = () => {
		const skeleton = spine.skeleton;
		if (!skeleton) return;
		try {
			skeleton.setAttachment('cartridge2', null);
		} catch {
			skeleton.findSlot('cartridge2')?.setAttachment(null);
		}
	};

	const playClip = (
		animation: MascotSpineAnimation,
		loop: boolean,
		opts?: {
			reverse?: boolean;
			holdEnd?: boolean;
			soft?: boolean;
			mix?: number;
			/** Truncate clip at this time (hat catch pause). */
			animationEnd?: number;
		},
	) => {
		const skeleton = spine.skeleton;
		const state = spine.state;
		if (!skeleton || !state) return;

		state.timeScale = props.timeScale;

		if (opts?.reverse) {
			const entry = state.setAnimation(0, animation, false);
			if (!entry) return;
			entry.reverse = true;
			entry.timeScale = 1;
			entry.trackTime = 0;
			if (opts.animationEnd != null) entry.animationEnd = opts.animationEnd;
			if (opts.mix != null) entry.mixDuration = opts.mix;
			state.apply(skeleton);
		hideSmileSlot();
		if (animation === 'gun_start') hideGunStartCartridge();
		return;
		}

		if (!opts?.soft) {
			const current = state.getCurrent(0);
			// Already looping this clip — keep the track (don't restart / T-pose).
			if (
				loop &&
				current?.loop &&
				current.animation?.name === animation &&
				!opts?.reverse &&
				opts?.animationEnd == null
			) {
				return;
			}
			state.clearTracks();
			skeleton.setToSetupPose();
		}
		const entry = state.setAnimation(0, animation, loop);
		if (!entry) return;
		entry.timeScale = 1;
		entry.reverse = false;
		if (opts?.animationEnd != null) entry.animationEnd = opts.animationEnd;
		if (opts?.mix != null) entry.mixDuration = opts.mix;
		state.apply(skeleton);
		hideSmileSlot();
		if (animation === 'gun_start') hideGunStartCartridge();
	};

	const holdCurrentClipEnd = () => {
		const entry = spine.state?.getCurrent(0);
		if (!entry) return;
		entry.trackTime = entry.animationEnd;
		entry.timeScale = 0;
		entry.reverse = false;
	};

	/** Unpause truncated `hat` and let it finish forward (return is in the clip). */
	const resumeHatForward = () => {
		const entry = spine.state?.getCurrent(0);
		const fullEnd = entry?.animation?.duration ?? MASCOT_HAT_DURATION_S;
		if (entry?.animation?.name === 'hat') {
			entry.reverse = false;
			entry.animationEnd = fullEnd;
			entry.trackTime = Math.min(entry.trackTime, MASCOT_HAT_HOLD_TIME_S);
			entry.timeScale = 1;
			spine.state?.apply(spine.skeleton);
			hideSmileSlot();
			return;
		}
		// Fallback if the track was lost — seek to hold and play out.
		playClip('hat', false, { soft: true });
		const next = spine.state?.getCurrent(0);
		if (!next) return;
		next.trackTime = MASCOT_HAT_HOLD_TIME_S;
		next.animationEnd = next.animation?.duration ?? MASCOT_HAT_DURATION_S;
		next.timeScale = 1;
		next.reverse = false;
		spine.state?.apply(spine.skeleton);
		hideSmileSlot();
	};

	const clearIdleVariantTimer = () => {
		if (idleVariantTimer !== undefined) {
			clearTimeout(idleVariantTimer);
			idleVariantTimer = undefined;
		}
		idleVariantArmed = false;
	};

	const resetIdleVariants = () => {
		clearIdleVariantTimer();
		idleVariantPlaying = false;
	};

	const clearForceIdle3 = () => {
		if (forceIdle3HoldTimer !== undefined) {
			clearTimeout(forceIdle3HoldTimer);
			forceIdle3HoldTimer = undefined;
		}
		forceIdle3Phase = null;
	};

	const scheduleIdleVariant = () => {
		clearIdleVariantTimer();
		if (activeForceAnim || activePose !== 'idle' || idleVariantPlaying) return;
		idleVariantTimer = setTimeout(() => {
			if (activeForceAnim || activePose !== 'idle' || idleVariantPlaying) return;
			idleVariantArmed = true;
		}, nextMascotIdleVariantDelayMs());
	};

	const isWinReactionPose = (pose: MascotPose | undefined): pose is 'react' | 'wow' | 'clap' =>
		pose === 'react' || pose === 'wow' || pose === 'clap';

	const settleWinReactionToIdle = (from: MascotPose) => {
		settledWinReaction = from;
		activePose = 'idle';
		scheduleIdleVariant();
	};

	const queueIdleAfterWinReaction = () => {
		const idleEntry = spine.state?.addAnimation(0, 'idle', true, 0);
		if (!idleEntry) return;
		idleEntry.mixDuration = 0.18;
		idleEntry.listener = {
			start: () => {
				if (activeForceAnim || !isWinReactionPose(activePose)) return;
				settleWinReactionToIdle(activePose);
			},
		};
	};

	const playArmedIdleVariant = () => {
		if (!idleVariantArmed || idleVariantPlaying) return;
		if (activeForceAnim || activePose !== 'idle') return;
		const current = spine.state?.getCurrent(0);
		if (current?.animation?.name !== 'idle') return;

		idleVariantArmed = false;
		idleVariantPlaying = true;
		const variant = pickMascotIdleVariant();
		// Weighted roll can pick base `idle` — stay on the loop, schedule next flavour.
		if (variant === 'idle' || !(MASCOT_IDLE_VARIANTS as readonly string[]).includes(variant)) {
			idleVariantPlaying = false;
			scheduleIdleVariant();
			return;
		}
		playClip(variant, false, { soft: true });
		spine.state?.addAnimation(0, 'idle', true, 0);
	};

	const onIdleFlavourComplete = (name: MascotSpineAnimation) => {
		if (activeForceAnim || activePose !== 'idle') return false;
		if (idleVariantPlaying && (MASCOT_IDLE_VARIANTS as readonly string[]).includes(name)) {
			idleVariantPlaying = false;
			scheduleIdleVariant();
			return true;
		}
		if (name === 'idle' && idleVariantArmed && !idleVariantPlaying) {
			playArmedIdleVariant();
			return true;
		}
		return false;
	};

	/**
	 * Soft-mix into `hat` only from rest idle (blink/ears ok).
	 * Mid-`idle_gyn` leaves gun finger slots on / left-hand off — soft mix into
	 * hat clears gun attachments before hat fingers key in (~0.5s) → missing hand.
	 */
	const canSoftMixIntoHat = () => {
		const name = spine.state?.getCurrent(0)?.animation?.name;
		return name === 'idle' || name === 'idle_blink' || name === 'idle_ears';
	};

	const playForceHatSequence = () => {
		forceIdle3Phase = 'catch';
		const soft = canSoftMixIntoHat();
		playClip('hat', false, {
			holdEnd: true,
			soft,
			mix: soft ? 0.08 : undefined,
			animationEnd: MASCOT_HAT_HOLD_TIME_S,
		});
	};

	const applyForceAnimation = (animation: MascotDevPreview) => {
		if (animation === activeForceAnim) return;
		activeForceAnim = animation;
		activePose = undefined;
		settledWinReaction = undefined;
		resetIdleVariants();
		clearForceIdle3();
		if (animation === 'hat') {
			playForceHatSequence();
			return;
		}
		playClip(animation, true);
	};

	const applyPose = (next: MascotPose) => {
		if (activeForceAnim) return;
		const prev = activePose;
		const playback = MASCOT_POSE_PLAYBACK[next];
		// Looping poses: never re-fire — Spine loop handles repeats.
		if (next === activePose && playback.loop) return;
		// Already returned to idle after this like/applause — keep idle flavour.
		if (isWinReactionPose(next) && settledWinReaction === next && activePose === 'idle') {
			return;
		}
		// Same one-shot applause under wow ↔ clap — don't restart the clip.
		if (
			prev &&
			next !== prev &&
			playback.animation === 'applause' &&
			MASCOT_POSE_PLAYBACK[prev]?.animation === 'applause'
		) {
			activePose = next;
			return;
		}
		// Same pose already playing (e.g. clap during win ladder) — don't restart.
		if (next === activePose && playback.animation === 'applause') return;

		activePose = next;
		if (next === 'idle') settledWinReaction = undefined;
		resetIdleVariants();

		// Hat: pause at hold, then resume the SAME track forward (no reverse / restart).
		if (next === 'hatCatch') {
			// Hard-cut from idle_gyn (gun hand) so hat finger attachments apply cleanly.
			const soft = prev === 'idle' && canSoftMixIntoHat();
			playClip('hat', false, {
				holdEnd: true,
				soft,
				mix: soft ? 0.08 : undefined,
				animationEnd: MASCOT_HAT_HOLD_TIME_S,
			});
			return;
		}
		if (next === 'hatOn') {
			resumeHatForward();
			return;
		}

		const fromHatToIdle = prev === 'hatOn' && next === 'idle';
		playClip(playback.animation, playback.loop, {
			reverse: playback.reverse,
			holdEnd: playback.holdEnd,
			soft: fromHatToIdle,
			mix: fromHatToIdle ? 0.18 : undefined,
		});
		if (isWinReactionPose(next) && playback.returnTo === 'idle') {
			queueIdleAfterWinReaction();
		}
		if (playback.loop && next === 'idle') {
			scheduleIdleVariant();
		}
	};

	const onComplete = (entry: { animation?: { name?: string } }) => {
		const name = entry.animation?.name as MascotSpineAnimation | undefined;

		if (activeForceAnim === 'hat') {
			if (name !== 'hat') return;
			if (forceIdle3Phase === 'catch') {
				holdCurrentClipEnd();
				forceIdle3Phase = 'hold';
				forceIdle3HoldTimer = setTimeout(() => {
					if (activeForceAnim !== 'hat') return;
					forceIdle3Phase = 'on';
					resumeHatForward();
				}, MASCOT_COIN_FLY_WAIT_MS);
				return;
			}
			// Finished put-on — one more cycle for DEV preview.
			if (forceIdle3Phase === 'on') playForceHatSequence();
			return;
		}

		if (activeForceAnim) return;
		if (!name || !activePose) return;
		if (onIdleFlavourComplete(name)) return;

		const playback = MASCOT_POSE_PLAYBACK[activePose];
		if (name !== playback.animation) return;
		if (playback.holdEnd) {
			holdCurrentClipEnd();
			return;
		}
		if (playback.returnTo) {
			const back = playback.returnTo;
			const currentName = spine.state?.getCurrent(0)?.animation?.name;
			if (back === 'idle' && isWinReactionPose(activePose)) {
				settleWinReactionToIdle(activePose);
			} else {
				activePose = back === 'idle' ? 'idle' : activePose;
			}
			if (currentName !== back) {
				playClip(back, true, {
					soft: activePose === 'idle' || back === 'idle',
					mix: 0.18,
				});
			}
			if (back === 'idle') {
				scheduleIdleVariant();
			}
		}
	};

	// Keep smile cleared after every apply (animations re-attach it).
	// Also suppress gun_start's embedded cartridge — FS fly uses the HTML overlay.
	$effect(() => {
		const state = spine.state;
		const apply = state.apply.bind(state);
		state.apply = (skeleton) => {
			const result = apply(skeleton);
			try {
				skeleton.setAttachment('smile', null);
			} catch {
				skeleton.findSlot('smile')?.setAttachment(null);
			}
			const animName = state.getCurrent(0)?.animation?.name;
			if (animName === 'gun_start') {
				try {
					skeleton.setAttachment('cartridge2', null);
				} catch {
					skeleton.findSlot('cartridge2')?.setAttachment(null);
				}
			}
			return result;
		};
		const listener = { complete: onComplete };
		state.addListener(listener);
		ready = true;
		hideSmileSlot();
		return () => {
			state.apply = apply;
			state.removeListener(listener);
			ready = false;
		};
	});

	$effect(() => {
		if (!ready) return;
		const forced = props.forceAnim;
		const token = props.animToken ?? 0;
		if (forced) {
			applyForceAnimation(forced);
			return;
		}
		if (activeForceAnim) {
			clearForceIdle3();
			resetIdleVariants();
			activeForceAnim = null;
			activePose = undefined;
			settledWinReaction = undefined;
		}
		// Same pose again (gun_shot×N): clear so applyPose re-fires the one-shot.
		if (token !== lastAnimToken) {
			lastAnimToken = token;
			activePose = undefined;
			settledWinReaction = undefined;
		}
		applyPose(props.pose);
	});

	$effect(() => {
		const scale = props.timeScale;
		if (spine.state) spine.state.timeScale = scale;
	});

	onDestroy(() => {
		resetIdleVariants();
		clearForceIdle3();
	});
</script>
