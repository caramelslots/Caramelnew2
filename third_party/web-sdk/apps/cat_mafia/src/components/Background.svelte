<script lang="ts">
	import { Container, Rectangle, SpineProvider, SpineTrack } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import { catBackgroundZoom } from '../game/catAnticipationBoardZoom.svelte';
	import {
		BG_Y_OFFSET,
		BG_IDLE_ANIMATION,
		getBackgroundCoverScale,
	} from '../game/neonBackgroundLayout';
	import { isPhoneCanvasSizeType } from '../game/streetOffscreenCull';
	import BackgroundSkinController from './BackgroundSkinController.svelte';
	import StreetOffscreenCull from './StreetOffscreenCull.svelte';

	const context = getContext();

	/**
	 * Spine origin (0,0) is scene center — no anchor / width / height.
	 * Cover-fit scale so the street fills the canvas (object-fit: cover).
	 */
	const spineProps = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		return {
			x: canvas.width / 2,
			y: canvas.height * (0.5 - BG_Y_OFFSET),
			scale: getBackgroundCoverScale(canvas),
		};
	});

	const showBaseBackground = $derived(context.stateGame.gameType === 'basegame');
	const showFeatureBackground = $derived(context.stateGame.gameType === 'freegame');
	const isPhone = $derived(isPhoneCanvasSizeType(context.stateLayoutDerived.canvasSizeType()));

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
			<SpineProvider key="mainBackground" {...spineProps}>
				<BackgroundSkinController skin="day" />
				<StreetOffscreenCull />
				{#if !isPhone}
					<SpineTrack trackIndex={0} animationName={BG_IDLE_ANIMATION} loop timeScale={1} />
				{/if}
			</SpineProvider>
		</Container>
	</Container>
</FadeContainer>

<FadeContainer show={showFeatureBackground} duration={SECOND} zIndex={-1}>
	<Container x={canvasCenter.x} y={canvasCenter.y} scale={backgroundZoom}>
		<Container x={-canvasCenter.x} y={-canvasCenter.y}>
			<SpineProvider key="mainBackground" {...spineProps}>
				<BackgroundSkinController skin="night" />
				<StreetOffscreenCull />
				{#if !isPhone}
					<SpineTrack trackIndex={0} animationName={BG_IDLE_ANIMATION} loop timeScale={1} />
				{/if}
			</SpineProvider>
		</Container>
	</Container>
</FadeContainer>
