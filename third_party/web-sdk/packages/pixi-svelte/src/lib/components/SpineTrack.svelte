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
	import { onDestroy } from 'svelte';

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
				// When the parent Spine is frozen (autoUpdate === false, e.g. a
				// zero-movement idle pose), the Pixi ticker will not advance the
				// skeleton, so the newly-set animation would never be applied.
				// Pose it once here so the rest frame renders correctly.
				if (spine.autoUpdate === false) {
					spine.update(0);
				}
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

	onDestroy(() => {
		spine.state.setEmptyAnimation(props.trackIndex, 0);
	});
</script>
