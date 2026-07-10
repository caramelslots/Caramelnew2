<script lang="ts">
	import { Container, Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import { catBackgroundZoom } from '../game/catAnticipationBoardZoom.svelte';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { getNeonOverlayProps, coverFit, BG_RATIO, BG_Y_OFFSET } from '../game/neonBackgroundLayout';
	import Lantern from './Lantern.svelte';
	import NeonBackgroundOverlay from './NeonBackgroundOverlay.svelte';

	const context = getContext();

	const cover = (ratio: number) => coverFit(context.stateLayoutDerived.canvasSizes(), ratio);

	const spriteProps = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		const bgCover = cover(BG_RATIO);
		return {
			x: canvas.width / 2,
			y: canvas.height * (0.5 - BG_Y_OFFSET),
			anchor: 0.5,
			...bgCover,
		};
	});

	const neonOverlayProps = $derived.by(() =>
		getNeonOverlayProps(context.stateLayoutDerived.canvasSizes()),
	);

	// Lantern composition (fractions of the canvas size). Both lanterns are
	// suspended from the top edge and sized as a fraction of canvas height,
	// so they scale with the layout instead of being absolute pixels.
	const LANTERN_HEIGHT_RATIO = 0.42;
	const LANTERN_TOP_RATIO = -0.04;
	const LANTERN_LEFT_RATIO = 0.17;
	const LANTERN_RIGHT_RATIO = 0.86;

	const lanternLayout = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		const height = canvas.height * LANTERN_HEIGHT_RATIO;
		const y = canvas.height * LANTERN_TOP_RATIO;
		return {
			height,
			y,
			leftX: canvas.width * LANTERN_LEFT_RATIO,
			rightX: canvas.width * LANTERN_RIGHT_RATIO,
		};
	});

	const showBaseBackground = $derived(context.stateGame.gameType === 'basegame');
	const showFeatureBackground = $derived(context.stateGame.gameType === 'freegame');

	const canvasCenter = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		return { x: canvas.width / 2, y: canvas.height / 2 };
	});

	const backgroundZoom = $derived(catBackgroundZoom.current);
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x000000} zIndex={-3} />

<FadeContainer show={showBaseBackground} duration={SECOND} zIndex={-2}>
	<Container x={canvasCenter.x} y={canvasCenter.y} scale={backgroundZoom}>
		<Container x={-canvasCenter.x} y={-canvasCenter.y}>
			<Sprite key="mainBackground" {...spriteProps} />
			<NeonBackgroundOverlay
				layer="behind"
				skin="day"
				x={neonOverlayProps.x}
				y={neonOverlayProps.y}
				scale={neonOverlayProps.scale}
				started={gameEntrance.showContent}
			/>
			<Lantern
				assetKey="lanternDay"
				x={lanternLayout.leftX}
				y={lanternLayout.y}
				height={lanternLayout.height}
			/>
			<Lantern
				assetKey="lanternDay"
				x={lanternLayout.rightX}
				y={lanternLayout.y}
				height={lanternLayout.height}
				phase={Math.PI}
			/>
		</Container>
	</Container>
</FadeContainer>

<FadeContainer show={showFeatureBackground} duration={SECOND} zIndex={-1}>
	<Container x={canvasCenter.x} y={canvasCenter.y} scale={backgroundZoom}>
		<Container x={-canvasCenter.x} y={-canvasCenter.y}>
			<Sprite key="featureBackground" {...spriteProps} />
			<NeonBackgroundOverlay
				layer="behind"
				skin="night"
				x={neonOverlayProps.x}
				y={neonOverlayProps.y}
				scale={neonOverlayProps.scale}
				started={gameEntrance.showContent}
			/>
			<Lantern
				assetKey="lanternNight"
				x={lanternLayout.leftX}
				y={lanternLayout.y}
				height={lanternLayout.height}
			/>
			<Lantern
				assetKey="lanternNight"
				x={lanternLayout.rightX}
				y={lanternLayout.y}
				height={lanternLayout.height}
				phase={Math.PI}
			/>
		</Container>
	</Container>
</FadeContainer>
