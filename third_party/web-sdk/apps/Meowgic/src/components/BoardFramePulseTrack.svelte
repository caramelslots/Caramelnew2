<script lang="ts">
	/**
	 * Force-replays a one-shot Spine clip whenever `playToken` bumps.
	 * SpineTrack skips setAnimation when the leftover track has the same name —
	 * that breaks DEV "Pulse Once" after the first press.
	 */
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		playToken: number;
		animationName: string;
		timeScale?: number;
		onComplete?: (token: number) => void;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	$effect(() => {
		const token = props.playToken;
		if (token <= 0) return;

		spine.state.setEmptyAnimation(0, 0);
		const entry = spine.state.setAnimation(0, props.animationName, false);
		if (entry) {
			entry.timeScale = props.timeScale ?? 1;
			entry.listener = {
				complete: () => {
					props.onComplete?.(token);
				},
			};
		}
		spine.spineAttachmentsDirty = true;
		if (spine.autoUpdate === false) {
			spine.update(0);
		}
	});
</script>
