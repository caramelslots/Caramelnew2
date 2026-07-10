<script lang="ts">
	import { Container, SpineProvider, SpineTrack } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { getOutlineReelLayout } from '../game/catAnticipation';
	import type { Reel } from '../game/stateGame.svelte';

	type Props = {
		reel: Reel;
	};

	const props: Props = $props();

	type AnimationName = 'in' | 'idle';

	let animationName = $state<AnimationName>('in');

	const layout = $derived(getOutlineReelLayout(props.reel.reelIndex));
</script>

<Container x={layout.x} y={layout.y} zIndex={20}>
	<SpineProvider
		key="outlineReel"
		x={layout.spineX}
		y={layout.spineY}
		scale={layout.scale}
	>
		<SpineTrack
			trackIndex={0}
			{animationName}
			loop={animationName === 'idle'}
			timeScale={stateBetDerived.timeScale()}
			listener={{
				complete: () => {
					if (animationName === 'in') animationName = 'idle';
				},
			}}
		/>
	</SpineProvider>
</Container>
