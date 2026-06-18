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
				// Set `reverse` and `animationEnd` synchronously — propsSyncEffect runs
				// after this effect, but Pixi's ticker may fire between microtask batches.
				// Applying them here guarantees the very first rendered frame is correct.
				if (track) {
					if (props.reverse) track.reverse = true;
					if (props.animationEnd !== undefined) track.animationEnd = props.animationEnd;
				}
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
