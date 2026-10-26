<!--
	Imperative pose / idle-flavour controller for the Pixi mascotCat spine.
	Mirrors the former HTML SpinePlayer logic in MascotPlaceholder.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import {
		MASCOT_IDLE_VARIANTS,
		MASCOT_POSE_PLAYBACK,
		nextMascotIdleVariantDelayMs,
		pickMascotIdleVariant,
		resolveMascotSpineClip,
		sealMascotHatBrimSeam,
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
		/** Freeze idle flavour while buy-bonus overlays cover the board. */
		paused?: boolean;
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

	/** Designer reference board baked into the wizard export. Not part of the slot. */
	const hideReferenceBoard = () => {
		const skeleton = spine.skeleton;
		if (!skeleton) return;
		try {
			skeleton.setAttachment('board', null);
		} catch {
			skeleton.findSlot('board')?.setAttachment(null);
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

		const clip = resolveMascotSpineClip(animation);
		if (!skeleton.data.findAnimation(clip)) return;

		state.timeScale = props.timeScale;

		if (opts?.reverse) {
			const entry = state.setAnimation(0, clip, false);
			if (!entry) return;
			entry.reverse = true;
			entry.timeScale = 1;
			entry.trackTime = 0;
			if (opts.animationEnd != null) entry.animationEnd = opts.animationEnd;
			if (opts.mix != null) entry.mixDuration = opts.mix;
			state.apply(skeleton);
			hideSmileSlot();
			hideReferenceBoard();
			return;
		}

		if (!opts?.soft) {
			const current = state.getCurrent(0);
			// Already looping this clip — keep the track (don't restart / T-pose).
			if (
				loop &&
				current?.loop &&
				current.animation?.name === clip &&
				!opts?.reverse &&
				opts?.animationEnd == null
			) {
				return;
			}
			state.clearTracks();
			skeleton.setToSetupPose();
		}
		const entry = state.setAnimation(0, clip, loop);
		if (!entry) return;
		entry.timeScale = 1;
		entry.reverse = false;
		if (opts?.animationEnd != null) entry.animationEnd = opts.animationEnd;
		if (opts?.mix != null) entry.mixDuration = opts.mix;
		state.apply(skeleton);
		hideSmileSlot();
		hideReferenceBoard();
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

	const scheduleIdleVariant = () => {
		clearIdleVariantTimer();
		if (props.paused || activeForceAnim || activePose !== 'idle' || idleVariantPlaying) return;
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
		if (props.paused || activeForceAnim || activePose !== 'idle') return;
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

	const onIdleFlavourComplete = (fileName: MascotSpineAnimation) => {
		const name = resolveMascotSpineClip(fileName);
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

	const applyForceAnimation = (animation: MascotDevPreview) => {
		if (animation === activeForceAnim) return;
		activeForceAnim = animation;
		activePose = undefined;
		settledWinReaction = undefined;
		resetIdleVariants();
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

		const clip = playback.animation;
		// Gun / load / hat have no clip on this skeleton — leave the current track.
		if (!clip) {
			activePose = next;
			return;
		}

		activePose = next;
		if (next === 'idle') settledWinReaction = undefined;
		resetIdleVariants();

		const fromHatToIdle = prev === 'hatOn' && next === 'idle';
		playClip(clip, playback.loop, {
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
		const fileName = entry.animation?.name as MascotSpineAnimation | undefined;
		const name = fileName ? resolveMascotSpineClip(fileName) : undefined;

		if (activeForceAnim) return;
		if (!fileName || !activePose) return;
		if (onIdleFlavourComplete(fileName)) return;

		const playback = MASCOT_POSE_PLAYBACK[activePose];
		if (name !== playback.animation) return;
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
			try {
				skeleton.setAttachment('board', null);
			} catch {
				skeleton.findSlot('board')?.setAttachment(null);
			}
			return result;
		};
		const listener = { complete: onComplete };
		state.addListener(listener);
		ready = true;
		hideSmileSlot();
		hideReferenceBoard();
		sealMascotHatBrimSeam(spine.skeleton);
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
		if (props.paused) resetIdleVariants();
	});

	$effect(() => {
		const scale = props.timeScale;
		if (spine.state) spine.state.timeScale = scale;
	});

	onDestroy(() => {
		resetIdleVariants();
	});
</script>
