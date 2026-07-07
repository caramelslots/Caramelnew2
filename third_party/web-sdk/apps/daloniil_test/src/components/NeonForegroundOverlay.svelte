<script lang="ts">
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import { getBoardCanvasBounds } from '../game/neonBoardAlignment';
	import { getNeonOverlayProps } from '../game/neonBackgroundLayout';
	import NeonBackgroundOverlay from './NeonBackgroundOverlay.svelte';

	const context = getContext();

	const neonOverlayProps = $derived.by(() =>
		getNeonOverlayProps(context.stateLayoutDerived.canvasSizes()),
	);

	const boardBounds = $derived.by(() =>
		getBoardCanvasBounds(
			context.stateLayoutDerived.mainLayout(),
			context.stateGameDerived.boardLayout(),
		),
	);

	const showBase = $derived(context.stateGame.gameType === 'basegame');
	const showFeature = $derived(context.stateGame.gameType === 'freegame');
</script>

<FadeContainer show={showBase} duration={SECOND} zIndex={5}>
	<NeonBackgroundOverlay
		layer="front"
		skin="day"
		boardBounds={boardBounds}
		x={neonOverlayProps.x}
		y={neonOverlayProps.y}
		width={neonOverlayProps.width}
		height={neonOverlayProps.height}
	/>
</FadeContainer>

<FadeContainer show={showFeature} duration={SECOND} zIndex={5}>
	<NeonBackgroundOverlay
		layer="front"
		skin="night"
		boardBounds={boardBounds}
		x={neonOverlayProps.x}
		y={neonOverlayProps.y}
		width={neonOverlayProps.width}
		height={neonOverlayProps.height}
	/>
</FadeContainer>
