<script lang="ts">
	import type * as PIXI from 'pixi.js';
	import { Container, Graphics, SpineProvider, SpineTrack } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import { drawOutlineReelColumnMask, getOutlineReelLayout } from '../game/catAnticipation';
	import type { Reel } from '../game/stateGame.svelte';

	type Props = {
		reel: Reel;
	};

	const props: Props = $props();

	type AnimationName = 'in' | 'idle';

	let animationName = $state<AnimationName>('in');

	const layout = $derived(getOutlineReelLayout(props.reel.reelIndex));
	const drawColumnMask = $derived((g: PIXI.Graphics) => {
		drawOutlineReelColumnMask(g, layout.maskW, layout.maskTop, layout.maskBottom);
	});
</script>

<Container x={layout.x} y={layout.y} zIndex={20} sortableChildren>
	<Container>
		<Graphics isMask draw={drawColumnMask} eventMode="none" />
		<SpineProvider
			key="outlineReel"
			x={layout.spineX}
			y={layout.spineY}
			scale={layout.scale}
			autoUpdate
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
</Container>
