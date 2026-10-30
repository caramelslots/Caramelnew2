<script lang="ts">
	/**
	 * DEV-only: force one BG clip and always replay on `nonce` bump.
	 *
	 * Plain `<SpineTrack>` skips setAnimation when the leftover track already
	 * has the same name — so re-clicking a one-shot looks dead. Higher idle
	 * tracks (lamps/particles) also kept fighting track 0. Clear everything
	 * first, then play.
	 */
	import { getContextSpine } from 'pixi-svelte';

	type Props = {
		animationName: string;
		loop: boolean;
		nonce: number;
		timeScale?: number;
	};

	const props: Props = $props();
	const spine = getContextSpine();

	$effect(() => {
		const name = props.animationName;
		const loop = props.loop;
		const scale = props.timeScale ?? 1;
		void props.nonce;

		spine.state.clearTracks();
		try {
			const entry = spine.state.setAnimation(0, name, loop);
			if (entry) entry.timeScale = scale;
		} catch (error) {
			console.error(`[BgDevForceClip] missing clip "${name}"`, error);
			const animations = spine.state.data?.skeletonData?.animations;
			if (animations) {
				console.log(
					'Available:',
					animations.map((animation) => animation.name),
				);
			}
		}
		spine.spineAttachmentsDirty = true;
		if (spine.autoUpdate === false) spine.update(0);
	});
</script>
