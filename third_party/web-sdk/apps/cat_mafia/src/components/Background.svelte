<script lang="ts">
	import { Container, Rectangle, SpineProvider, SpineTrack } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { catBackgroundZoom } from '../game/catAnticipationBoardZoom.svelte';
	import {
		BG_Y_OFFSET,
		BG_IDLE_ANIMATION,
		getBackgroundPixiScale,
	} from '../game/neonBackgroundLayout';
	import { isPhoneCanvasSizeType } from '../game/streetOffscreenCull';
	import { stateDuel } from '../game/stateDuel.svelte';
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
			scale: getBackgroundPixiScale(canvas),
		};
	});

	/**
	 * While the HTML loader still is up, keep Pixi street + black clear so
	 * loading clouds can draw over the still on a transparent canvas.
	 * Street mounts under cover when hideLoaderStreet flips at theme-switch.
	 */
	const hidePixiStreet = $derived(
		context.stateLayout.showLoadingScreen && !gameEntrance.hideLoaderStreet,
	);

	/** Duel night street — same timing as FS (after cloud cover, not on pick screen). */
	const showDuelBackground = $derived(stateDuel.active || stateDuel.phase === 'outro');
	const showBaseBackground = $derived(
		context.stateGame.gameType === 'basegame' && !showDuelBackground && !hidePixiStreet,
	);
	const showFeatureBackground = $derived(
		(context.stateGame.gameType === 'freegame' || showDuelBackground) && !hidePixiStreet,
	);
	const isPhone = $derived(isPhoneCanvasSizeType(context.stateLayoutDerived.canvasSizeType()));
	/** Freeze street while bootstrap / cards / press-to-continue are up. */
	const loaderActive = $derived(context.stateLayout.showLoadingScreen);
	const playStreetIdle = $derived(!isPhone && !loaderActive);
	/** Instant under loading clouds; normal fade for in-game day/night swaps. */
	const bgFadeMs = $derived(loaderActive ? 0 : SECOND);

	const canvasCenter = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		return { x: canvas.width / 2, y: canvas.height / 2 };
	});

	const backgroundZoom = $derived(catBackgroundZoom.current);
</script>

{#if !hidePixiStreet}
	<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x000000} zIndex={-3} />
{/if}

<FadeContainer show={showBaseBackground} duration={bgFadeMs} zIndex={-2}>
	<Container x={canvasCenter.x} y={canvasCenter.y} scale={backgroundZoom}>
		<Container x={-canvasCenter.x} y={-canvasCenter.y}>
			<SpineProvider key="mainBackground" {...spineProps}>
				<BackgroundSkinController skin="day" />
				<StreetOffscreenCull />
				{#if playStreetIdle}
					<SpineTrack trackIndex={0} animationName={BG_IDLE_ANIMATION} loop timeScale={1} />
				{/if}
			</SpineProvider>
		</Container>
	</Container>
</FadeContainer>

<FadeContainer show={showFeatureBackground} duration={bgFadeMs} zIndex={-1}>
	<Container x={canvasCenter.x} y={canvasCenter.y} scale={backgroundZoom}>
		<Container x={-canvasCenter.x} y={-canvasCenter.y}>
			<SpineProvider key="mainBackground" {...spineProps}>
				<BackgroundSkinController skin="night" />
				<StreetOffscreenCull />
				{#if playStreetIdle}
					<SpineTrack trackIndex={0} animationName={BG_IDLE_ANIMATION} loop timeScale={1} />
				{/if}
			</SpineProvider>
		</Container>
	</Container>
</FadeContainer>
