<!--
	Imperative pose / idle-flavour controller for the Pixi mascotCat spine.
	Mirrors the former HTML SpinePlayer logic in MascotPlaceholder.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import {
		MASCOT_COIN_FLY_WAIT_MS,
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
	};

	const props: Props = $props();
	const spine = getContextSpine();

	let ready = $state(false);
	let activePose: MascotPose | undefined;
	let activeForceAnim: MascotDevPreview | null | undefined;
	let idleVariantTimer: ReturnType<typeof setTimeout> | undefined;
	let idleVariantArmed = false;
	let idleVariantPlaying = false;
	let forceIdle3Phase: 'catch' | 'hold' | 'on' | null = null;
	let forceIdle3HoldTimer: ReturnType<typeof setTimeout> | undefined;

	const hideSmileSlot = () => {
		const skeleton = spine.skeleton;
		if (!skeleton) return;
		try {
			skeleton.setAttachment('smile', null);
		} catch {
			skeleton.findSlot('smile')?.setAttachment(null);
		}
	};

	const playClip = (
		animation: MascotSpineAnimation,
		loop: boolean,
		opts?: { reverse?: boolean; holdEnd?: boolean; soft?: boolean; mix?: number },
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
			if (opts.mix != null) entry.mixDuration = opts.mix;
			state.apply(skeleton);
			hideSmileSlot();
			return;
		}

		if (!opts?.soft) {
			state.clearTracks();
			skeleton.setToSetupPose();
		}
		const entry = state.setAnimation(0, animation, loop);
		if (!entry) return;
		entry.timeScale = 1;
		entry.reverse = false;
		if (opts?.mix != null) entry.mixDuration = opts.mix;
		state.apply(skeleton);
		hideSmileSlot();
	};

	const holdCurrentClipEnd = () => {
		const entry = spine.state?.getCurrent(0);
		if (!entry) return;
		entry.trackTime = entry.animationEnd;
		entry.timeScale = 0;
		entry.reverse = false;
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

	const playArmedIdleVariant = () => {
		if (!idleVariantArmed || idleVariantPlaying) return;
		if (activeForceAnim || activePose !== 'idle') return;
		const current = spine.state?.getCurrent(0);
		if (current?.animation?.name !== 'idle') return;

		idleVariantArmed = false;
		idleVariantPlaying = true;
		const variant = pickMascotIdleVariant();
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

	const playForceIdle3Sequence = () => {
		forceIdle3Phase = 'catch';
		playClip('idle3', false, { holdEnd: true, soft: true, mix: 0.08 });
	};

	const applyForceAnimation = (animation: MascotDevPreview) => {
		if (animation === activeForceAnim) return;
		activeForceAnim = animation;
		activePose = undefined;
		resetIdleVariants();
		clearForceIdle3();
		if (animation === 'idle3') {
			playForceIdle3Sequence();
			return;
		}
		playClip(animation, true);
	};

	const applyPose = (next: MascotPose) => {
		if (activeForceAnim) return;
		if (next === activePose) return;
		const prev = activePose;
		activePose = next;
		resetIdleVariants();
		const playback = MASCOT_POSE_PLAYBACK[next];
		const fromIdleToHat = prev === 'idle' && next === 'hatCatch';
		const fromHatToIdle = prev === 'hatOn' && next === 'idle';
		playClip(playback.animation, playback.loop, {
			reverse: playback.reverse,
			holdEnd: playback.holdEnd,
			soft: fromIdleToHat || fromHatToIdle,
			mix: fromIdleToHat ? 0.08 : fromHatToIdle ? 0.18 : undefined,
		});
		if (playback.loop && next === 'idle') scheduleIdleVariant();
	};

	const onComplete = (entry: { animation?: { name?: string } }) => {
		const name = entry.animation?.name as MascotSpineAnimation | undefined;

		if (activeForceAnim === 'idle3') {
			if (name !== 'idle3') return;
			if (forceIdle3Phase === 'catch') {
				holdCurrentClipEnd();
				forceIdle3Phase = 'hold';
				forceIdle3HoldTimer = setTimeout(() => {
					if (activeForceAnim !== 'idle3') return;
					forceIdle3Phase = 'on';
					playClip('idle3', false, { reverse: true });
				}, MASCOT_COIN_FLY_WAIT_MS);
				return;
			}
			if (forceIdle3Phase === 'on') playForceIdle3Sequence();
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
		if (playback.reverse || playback.returnTo) {
			if (!playback.returnTo) return;
			const back = playback.returnTo;
			activePose = back === 'idle' ? 'idle' : activePose;
			playClip(back, true, {
				soft: playback.reverse,
				mix: playback.reverse ? 0.18 : undefined,
			});
			if (back === 'idle') scheduleIdleVariant();
		}
	};

	// Keep smile cleared after every apply (animations re-attach it).
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
		if (forced) {
			applyForceAnimation(forced);
			return;
		}
		if (activeForceAnim) {
			clearForceIdle3();
			resetIdleVariants();
			activeForceAnim = null;
			activePose = undefined;
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
