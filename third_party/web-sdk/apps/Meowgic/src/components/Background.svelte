<script lang="ts">
	import { Container, Rectangle, SpineProvider, SpineTrack, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';
	import { devPreview } from '../game/devPreview.svelte';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { catBackgroundZoom } from '../game/catAnticipationBoardZoom.svelte';
	import {
		BG_IDLE_ANIMATION,
		BG_ONLY_IDLE_TRACKS,
		BG_TABLE_IDLE_TRACKS,
		getBackgroundPixiCoverScreenBox,
		getBackgroundPixiScale,
		getBackgroundSpineY,
		type BackgroundThemeSkin,
	} from '../game/neonBackgroundLayout';
	import { isPhoneCanvasSizeType } from '../game/streetOffscreenCull';
	import { stateDuel } from '../game/stateDuel.svelte';
	import BackgroundSkinController from './BackgroundSkinController.svelte';
	import StreetOffscreenCull from './StreetOffscreenCull.svelte';

	const context = getContext();

	const showDemoArt = $derived(devPreview.forceShowDemoStageArt);

	/**
	 * Spine origin (0,0) is scene center — no anchor / width / height.
	 * Cover-fit scale so the street fills the canvas (object-fit: cover).
	 * All three pieces share this transform (designer world positions).
	 */
	const spineProps = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		return {
			x: canvas.width / 2,
			y: getBackgroundSpineY(canvas),
			scale: getBackgroundPixiScale(canvas),
		};
	});

	/** Demo still plate — same screen box as the Spine street. */
	const demoPlate = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		const box = getBackgroundPixiCoverScreenBox(canvas);
		return {
			x: spineProps.x,
			y: spineProps.y,
			width: box.width,
			height: box.height,
		};
	});

	/**
	 * HTML day.webp covers loading. On Continue, show Pixi street immediately
	 * so the steam transition paints over the real room (not black).
	 */
	const hidePixiStreet = $derived(
		context.stateLayout.showLoadingScreen &&
			!gameEntrance.loaderExitActive &&
			!gameEntrance.showContent,
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
	/** Invisible green spine, constructed before the steam so the clip doesn't hitch. */
	const nightPrewarm = $derived(context.stateGame.duelNightArmed && !showFeatureBackground);
	/**
	 * Keep the purple spine resident across the duel swap. Dropping and
	 * recreating it under the steam was part of the remaining transition hitch.
	 * Phone holds it for the whole duel; desktop only through the clip, so a
	 * hidden street is not drawn for the rest of the mode.
	 */
	const keepDayMounted = $derived(
		(isPhone &&
			(context.stateGame.transitionActive ||
				context.stateGame.duelNightArmed ||
				showDuelBackground)) ||
			(!isPhone &&
				(context.stateGame.duelNightArmed ||
					stateDuel.prebuild ||
					(context.stateGame.transitionActive && stateDuel.phase !== 'idle'))),
	);
	/** Animate once the slot is in play; phones stay on first frame. */
	const playStreetIdle = $derived(!isPhone && gameEntrance.liftComplete);
	const streetTimeScale = $derived(playStreetIdle ? 1 : 0);
	/**
	 * Under the steam the crossfade is invisible, and a 1s overlap kept two
	 * full street spines alive on the same frames as the duel mount.
	 * Outside a transition, purple/green still crossfade.
	 */
	const bgFadeMs = $derived(
		context.stateLayout.showLoadingScreen || context.stateGame.transitionActive ? 0 : SECOND,
	);

	const canvasCenter = $derived.by(() => {
		const canvas = context.stateLayoutDerived.canvasSizes();
		return { x: canvas.width / 2, y: canvas.height / 2 };
	});

	const backgroundZoom = $derived(catBackgroundZoom.current);
</script>

{#snippet streetPieces(theme: BackgroundThemeSkin, timeScale: number)}
	<!-- Draw order: room plate → stage → desk (matches designer layering). -->
	<SpineProvider key="mainBackground" {...spineProps}>
		<BackgroundSkinController skin={theme} />
		<StreetOffscreenCull />
		<SpineTrack
			trackIndex={0}
			animationName={BG_IDLE_ANIMATION}
			loop
			timeScale={timeScale}
		/>
		{#each BG_ONLY_IDLE_TRACKS as track (track.trackIndex)}
			<SpineTrack
				trackIndex={track.trackIndex}
				animationName={track.animationName}
				loop
				timeScale={timeScale}
			/>
		{/each}
	</SpineProvider>
	<SpineProvider key="bgPlatform" {...spineProps}>
		<BackgroundSkinController skin={theme} />
	</SpineProvider>
	<SpineProvider key="bgTable" {...spineProps}>
		<BackgroundSkinController skin={theme} />
		<StreetOffscreenCull />
		<SpineTrack
			trackIndex={0}
			animationName={BG_IDLE_ANIMATION}
			loop
			timeScale={timeScale}
		/>
		{#each BG_TABLE_IDLE_TRACKS as track (track.trackIndex)}
			<SpineTrack
				trackIndex={track.trackIndex}
				animationName={track.animationName}
				loop
				timeScale={timeScale}
			/>
		{/each}
	</SpineProvider>
{/snippet}

{#if !hidePixiStreet}
	<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x000000} zIndex={-3} />
{/if}

{#if showDemoArt && !hidePixiStreet}
	<Container x={canvasCenter.x} y={canvasCenter.y} scale={backgroundZoom} zIndex={-2}>
		<Container x={-canvasCenter.x} y={-canvasCenter.y}>
			<Sprite
				key="demoBackground"
				x={demoPlate.x}
				y={demoPlate.y}
				width={demoPlate.width}
				height={demoPlate.height}
				anchor={0.5}
			/>
		</Container>
	</Container>
{:else}
	<FadeContainer show={showBaseBackground} persistent={keepDayMounted} duration={bgFadeMs} zIndex={-2}>
		<Container x={canvasCenter.x} y={canvasCenter.y} scale={backgroundZoom}>
			<Container x={-canvasCenter.x} y={-canvasCenter.y}>
				{@render streetPieces('purple', showBaseBackground ? streetTimeScale : 0)}
			</Container>
		</Container>
	</FadeContainer>

	<FadeContainer
		show={showFeatureBackground}
		persistent={nightPrewarm || showFeatureBackground}
		duration={nightPrewarm ? 0 : bgFadeMs}
		zIndex={-1}
	>
		<Container x={canvasCenter.x} y={canvasCenter.y} scale={backgroundZoom}>
			<Container x={-canvasCenter.x} y={-canvasCenter.y}>
				{@render streetPieces('green', showFeatureBackground ? streetTimeScale : 0)}
			</Container>
		</Container>
	</FadeContainer>
{/if}
