<script lang="ts">
	import { Container, Rectangle, SpineProvider, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';
	import { stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';
	import { devPreview } from '../game/devPreview.svelte';
	import { catBackgroundZoom } from '../game/catAnticipationBoardZoom.svelte';
	import {
		bgDevTargetsRoom,
		bgDevTargetsTable,
	} from '../game/bgDevPreview';
	import {
		BG_ROOM_IDLE_TRACKS,
		BG_ROOM_REACTION_TRACKS,
		BG_TABLE_IDLE_STACK,
		BG_TABLE_REACTION_TRACKS,
		getBackgroundPixiCoverScreenBox,
		getBackgroundPixiScale,
		getBackgroundSpineY,
		type BackgroundThemeSkin,
	} from '../game/neonBackgroundLayout';
	import { spinSceneReaction } from '../game/spinSceneReaction.svelte';
	import { isPhoneCanvasSizeType } from '../game/streetOffscreenCull';
	import { stateDuel } from '../game/stateDuel.svelte';
	import BackgroundSkinController from './BackgroundSkinController.svelte';
	import BgDevForceClip from './BgDevForceClip.svelte';
	import SpineTrackStackController from './SpineTrackStackController.svelte';
	import StreetOffscreenCull from './StreetOffscreenCull.svelte';

	const context = getContext();

	const showDemoArt = $derived(devPreview.forceShowDemoStageArt);
	/** DEV: force a single BG clip instead of the stacked production idles. */
	const forcedBgAnim = $derived(devPreview.bgAnim);
	const forceRoomClip = $derived(
		forcedBgAnim ? bgDevTargetsRoom(forcedBgAnim.target) : false,
	);
	const forceTableClip = $derived(
		forcedBgAnim ? bgDevTargetsTable(forcedBgAnim.target) : false,
	);

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

	/** Duel night street — same timing as FS (after cloud cover, not on pick screen). */
	const showDuelBackground = $derived(stateDuel.active || stateDuel.phase === 'outro');
	const showBaseBackground = $derived(
		context.stateGame.gameType === 'basegame' && !showDuelBackground,
	);
	const showFeatureBackground = $derived(
		context.stateGame.gameType === 'freegame' || showDuelBackground,
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
	/** Same idle loop on the opening screen and in the slot, including during the drop. */
	const streetTimeScale = $derived(context.stateGame.winOverlayActive ? 0 : 1);
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
	{@const stackTimeScale = timeScale * stateBetDerived.timeScale()}
	{@const bgReactionToken =
		timeScale > 0 && !forcedBgAnim ? spinSceneReaction.token : 0}
	<!-- Draw order: room plate → stage → desk (matches designer layering). -->
	<SpineProvider key="mainBackground" {...spineProps}>
		<BackgroundSkinController skin={theme} />
		<StreetOffscreenCull />
		{#if forceRoomClip && forcedBgAnim}
			<BgDevForceClip
				animationName={forcedBgAnim.animationName}
				loop={forcedBgAnim.loop}
				nonce={forcedBgAnim.nonce}
				timeScale={timeScale}
			/>
		{:else}
			<SpineTrackStackController
				idleTracks={BG_ROOM_IDLE_TRACKS}
				reactionTracks={BG_ROOM_REACTION_TRACKS}
				oneShot
				alphaFade
				reactionToken={bgReactionToken}
				timeScale={stackTimeScale}
			/>
		{/if}
	</SpineProvider>
	<SpineProvider key="bgPlatform" {...spineProps}>
		<BackgroundSkinController skin={theme} />
	</SpineProvider>
	<SpineProvider key="bgTable" {...spineProps}>
		<BackgroundSkinController skin={theme} />
		<StreetOffscreenCull />
		{#if forceTableClip && forcedBgAnim}
			<BgDevForceClip
				animationName={forcedBgAnim.animationName}
				loop={forcedBgAnim.loop}
				nonce={forcedBgAnim.nonce}
				timeScale={timeScale}
			/>
		{:else}
			<SpineTrackStackController
				idleTracks={BG_TABLE_IDLE_STACK}
				reactionTracks={BG_TABLE_REACTION_TRACKS}
				oneShot
				alphaFade
				reactionToken={bgReactionToken}
				timeScale={stackTimeScale}
			/>
		{/if}
	</SpineProvider>
{/snippet}

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x000000} zIndex={-3} />

{#if showDemoArt}
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
