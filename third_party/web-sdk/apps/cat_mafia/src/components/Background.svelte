<script lang="ts">
	import { Container, Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import { catBackgroundZoom } from '../game/catAnticipationBoardZoom.svelte';
	import { coverFit, BG_RATIO, BG_Y_OFFSET } from '../game/neonBackgroundLayout';

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
		</Container>
	</Container>
</FadeContainer>

<FadeContainer show={showFeatureBackground} duration={SECOND} zIndex={-1}>
	<Container x={canvasCenter.x} y={canvasCenter.y} scale={backgroundZoom}>
		<Container x={-canvasCenter.x} y={-canvasCenter.y}>
			<Sprite key="featureBackground" {...spriteProps} />
		</Container>
	</Container>
</FadeContainer>
