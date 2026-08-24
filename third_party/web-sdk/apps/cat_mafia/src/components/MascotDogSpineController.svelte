<!--
	Imperative pose / idle-flavour controller for the Pixi mascotDog spine.
	Same scheduling pattern as MascotSpineController; dog clip names differ.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import {
		MASCOT_DOG_IDLE_VARIANTS,
		MASCOT_DOG_POSE_PLAYBACK,
		nextMascotIdleVariantDelayMs,
		pickMascotDogIdleVariant,
		type MascotDogSpineAnimation,
		type MascotPose,
	} from '../game/mascotHtmlSpine';

	type Props = {
		pose: MascotPose;
		/** DEV — force a dog clip (loop). When set, pose-driven playback is paused. */
		forceAnim?: MascotDogSpineAnimation | null;
		timeScale: number;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	let ready = $state(false);
	let activePose: MascotPose | undefined;
	let activeForceAnim: MascotDogSpineAnimation | null | undefined;
	let idleVariantTimer: ReturnType<typeof setTimeout> | undefined;
	let idleVariantArmed = false;
	let idleVariantPlaying = false;

	const playClip = (
		animation: MascotDogSpineAnimation,
		loop: boolean,
		opts?: { soft?: boolean; mix?: number },
	) => {
		const skeleton = spine.skeleton;
		const state = spine.state;
		if (!skeleton || !state) return;

		state.timeScale = props.timeScale;

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
		const variant = pickMascotDogIdleVariant();
		playClip(variant, false, { soft: true });
		spine.state?.addAnimation(0, 'idle', true, 0);
	};

	const onIdleFlavourComplete = (name: MascotDogSpineAnimation) => {
		if (activeForceAnim || activePose !== 'idle') return false;
		if (idleVariantPlaying && (MASCOT_DOG_IDLE_VARIANTS as readonly string[]).includes(name)) {
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

	const applyForceAnimation = (animation: MascotDogSpineAnimation) => {
		if (animation === activeForceAnim) return;
		activeForceAnim = animation;
		activePose = undefined;
		resetIdleVariants();
		playClip(animation, true);
	};

	const applyPose = (next: MascotPose) => {
		if (activeForceAnim) return;
		if (next === activePose) return;
		activePose = next;
		resetIdleVariants();
		const playback = MASCOT_DOG_POSE_PLAYBACK[next];
		playClip(playback.animation, playback.loop);
		if (playback.loop && next === 'idle') scheduleIdleVariant();
	};

	const onComplete = (entry: { animation?: { name?: string } }) => {
		if (activeForceAnim) return;
		const name = entry.animation?.name as MascotDogSpineAnimation | undefined;
		if (!name || !activePose) return;
		if (onIdleFlavourComplete(name)) return;

		const playback = MASCOT_DOG_POSE_PLAYBACK[activePose];
		if (name !== playback.animation) return;
		if (playback.returnTo) {
			const back = playback.returnTo;
			activePose = back === 'idle' ? 'idle' : activePose;
			playClip(back, true);
			if (back === 'idle') scheduleIdleVariant();
		}
	};

	$effect(() => {
		const state = spine.state;
		const listener = { complete: onComplete };
		state.addListener(listener);
		ready = true;
		return () => {
			state.removeListener(listener);
			ready = false;
		};
	});

	$effect(() => {
		if (!ready) return;
		const forced = props.forceAnim ?? null;
		if (forced) {
			applyForceAnimation(forced);
			return;
		}
		if (activeForceAnim) {
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
	});
</script>
