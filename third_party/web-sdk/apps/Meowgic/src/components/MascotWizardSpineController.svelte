<!--
	Imperative controller for the Pixi mascotCatWizard spine.
	DEV preview only — force-plays a wizard clip in a loop.
-->
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getContextSpine } from 'pixi-svelte';

	import type { MascotWizardSpineAnimation } from '../game/mascotHtmlSpine';

	type Props = {
		/** DEV — force a wizard clip (loop). */
		forceAnim?: MascotWizardSpineAnimation | null;
		timeScale: number;
		paused?: boolean;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	let ready = $state(false);
	let activeForceAnim: MascotWizardSpineAnimation | null | undefined;

	const playClip = (animation: MascotWizardSpineAnimation, loop: boolean) => {
		const skeleton = spine.skeleton;
		const state = spine.state;
		if (!skeleton || !state) return;

		state.timeScale = props.timeScale;
		state.clearTracks();
		skeleton.setToSetupPose();
		const entry = state.setAnimation(0, animation, loop);
		if (!entry) return;
		entry.timeScale = 1;
		entry.reverse = false;
		state.apply(skeleton);
	};

	const applyForceAnimation = (animation: MascotWizardSpineAnimation) => {
		if (animation === activeForceAnim) return;
		activeForceAnim = animation;
		playClip(animation, true);
	};

	$effect(() => {
		ready = true;
		return () => {
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
		activeForceAnim = null;
	});

	$effect(() => {
		const scale = props.timeScale;
		if (spine.state) spine.state.timeScale = scale;
	});

	onDestroy(() => {
		activeForceAnim = null;
	});
</script>
