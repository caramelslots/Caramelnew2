<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Container, SpineProvider, SpineSlot, SpineTrack } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import { BOARD_SIZES } from '../game/constants';

	type Props = {
		title: Snippet<[{ width: number; height: number }]>;
		winAmount: Snippet<[{ width: number; height: number }]>;
	};

	const props: Props = $props();

	type AnimationName = 'appear' | 'idle';

	const context = getContext();

	// SPINE_WIDTH drives the uniform scale applied by SpineProvider.
	// All content inside SpineSlots scales proportionally with this value.
	const SPINE_WIDTH = BOARD_SIZES.width * 0.6;

	let animationName = $state<AnimationName>('appear');
</script>

<MainContainer>
	<!-- Container sits at board centre; spine root is at the same point. -->
	<Container
		x={context.stateGameDerived.boardLayout().x}
		y={context.stateGameDerived.boardLayout().y}
	>
		<SpineProvider key="fsPopup" width={SPINE_WIDTH}>
			<SpineTrack
				trackIndex={0}
				{animationName}
				loop={animationName === 'idle'}
				listener={{
					complete: () => (animationName = 'idle'),
				}}
			/>
			<SpineSlot slotName="text_placeholder_1">
				{@render props.title({ width: BOARD_SIZES.width, height: BOARD_SIZES.height })}
			</SpineSlot>
			<SpineSlot slotName="text_placeholder_2">
				{@render props.winAmount({ width: BOARD_SIZES.width, height: BOARD_SIZES.height })}
			</SpineSlot>
		</SpineProvider>
	</Container>
</MainContainer>
