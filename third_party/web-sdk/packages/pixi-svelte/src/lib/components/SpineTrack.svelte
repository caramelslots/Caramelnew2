<script lang="ts" module>
	import * as SPINE_PIXI from '@esotericsoftware/spine-pixi-v8';

	type SpineState = SPINE_PIXI.Spine['state'];
	type TrackEntry = SPINE_PIXI.TrackEntry;

	export type Props = Partial<TrackEntry> & {
		trackIndex: Parameters<SpineState['setAnimation']>[0];
		animationName: Parameters<SpineState['setAnimation']>[1];
	};
</script>

<script lang="ts">
	import { propsSyncEffect } from '../utils.svelte';
	import { getContextSpine } from '../context.svelte';

	const props: Props = $props();
	const spine = getContextSpine();

	let track = $state(spine.state.tracks[props.trackIndex]);

	$effect(() => {
		if (props.trackIndex !== track?.trackIndex || props.animationName !== track?.animation?.name) {
			if (track) spine.state.setEmptyAnimation(track.trackIndex, 0);
			try {
				track = spine.state.setAnimation(props.trackIndex, props.animationName, props.loop);
				// Set `reverse` and `animationEnd` synchronously — propsSyncEffect runs
				// after this effect, but Pixi's ticker may fire between microtask batches.
				// Applying them here guarantees the very first rendered frame is correct.
				if (track) {
					if (props.reverse) track.reverse = true;
					if (props.animationEnd !== undefined) track.animationEnd = props.animationEnd;
				}
				// Always pose immediately. When autoUpdate is already false the
				// ticker will not run; when it flips false in the same flush as
				// this setAnimation (e.g. appear_flash → frozen main_coin_slow),
				// skipping update(0) leaves the previous clip's last bright frame.
				spine.update(0);
				// Force a SpinePipe rebuild — clip swaps can introduce slots that
				// were never batched, which 4.2.74 then crashes on `_batcher`.
				spine.spineAttachmentsDirty = true;
			} catch (error) {
				console.error(error);
				const animations = spine?.state?.data?.skeletonData?.animations;
				if (animations) {
					console.log(
						'Available animation names:',
						animations.map((animation) => animation.name),
					);
				}
			}
		}
	});

	propsSyncEffect({ props, target: () => track, ignore: ['trackIndex', 'animationName'] });
</script>
