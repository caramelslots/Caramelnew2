<script lang="ts">
	/**
	 * Force-replays one-shot Spine clip(s) whenever `playToken` bumps.
	 * SpineTrack skips setAnimation when the leftover track has the same name —
	 * that breaks DEV "Pulse Once" / Spin reaction after the first press.
	 *
	 * Clears every track first so layered idles do not keep fighting bones
	 * that the one-shot stack also drives.
	 */
	import { getContextSpine } from 'pixi-svelte';

	type TrackClip = {
		trackIndex: number;
		animationName: string;
	};

	type Props = {
		playToken: number;
		/** Multi-track stack (e.g. BG room/table reaction). */
		tracks?: readonly TrackClip[];
		/** Shorthand: single clip on track 0 (board reaction). */
		animationName?: string;
		timeScale?: number;
		onComplete?: (token: number) => void;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	$effect(() => {
		const token = props.playToken;
		if (token <= 0) return;

		const clips: readonly TrackClip[] =
			props.tracks ??
			(props.animationName
				? [{ trackIndex: 0, animationName: props.animationName }]
				: []);
		if (clips.length === 0) return;

		spine.state.clearTracks();
		const timeScale = props.timeScale ?? 1;
		let pending = 0;
		let finished = false;

		const finish = () => {
			if (finished) return;
			finished = true;
			props.onComplete?.(token);
		};

		for (const clip of clips) {
			const entry = spine.state.setAnimation(
				clip.trackIndex,
				clip.animationName,
				false,
			);
			if (!entry) continue;
			entry.timeScale = timeScale;
			pending += 1;
			entry.listener = {
				complete: () => {
					pending -= 1;
					if (pending <= 0) finish();
				},
			};
		}

		if (pending === 0) finish();

		spine.spineAttachmentsDirty = true;
		if (spine.autoUpdate === false) {
			spine.update(0);
		}
	});
</script>
