<script lang="ts">
	import { onMount, untrack, type Component } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import GameApp from './GameApp.svelte';
	import { stateModal } from 'state-shared';

	import { GameVersion } from 'components-ui-html';
	import { Container } from 'pixi-svelte';
	import UiCashStacksLayout from './UiCashStacksLayout.svelte';
	import CashStacksModals from './CashStacksModals.svelte';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { startLoadingIdleUiPreload } from '../game/uiHtmlAssetManifest';
	import { PHONE_TICKER_MAX_FPS } from '../game/duelPhoneDpr';
	import { isPhoneForAtlasDownscale } from '../game/phoneSpineAtlasDownscale';
	import { entranceTimelineMs } from '../game/entranceReveal';
	import {
		applyEntranceFrame,
		entranceCameraCssScale,
		entranceReveal,
		restEntranceReveal,
	} from '../game/entranceReveal.svelte';
	import {
		LOADER_CARD_2_SOCIAL_IMAGE_URL,
		LOADER_SCREEN_IMAGE_URLS,
		loaderScreenImageUrls,
	} from '../game/loaderCardAssets';
	import { clearHtmlPreloadMemoryRegistry } from '../game/preloadHtmlImages';
	import { stateDuel } from '../game/stateDuel.svelte';
	import EnableSound from './EnableSound.svelte';
	import EnableSymbolTextureOptimization from './EnableSymbolTextureOptimization.svelte';
	import EnableSymbolCellFit from './EnableSymbolCellFit.svelte';
	import EnableUiTextureOptimization from './EnableUiTextureOptimization.svelte';
	import EnablePhoneSpineAtlasDownscale from './EnablePhoneSpineAtlasDownscale.svelte';
	import EnableMascotCatSkinMemory from './EnableMascotCatSkinMemory.svelte';
	import EnableTirGpuMemory from './EnableTirGpuMemory.svelte';
	import EnableFeatureGpuMemory from './EnableFeatureGpuMemory.svelte';
	import EnableCanvasTextGpuGuard from './EnableCanvasTextGpuGuard.svelte';
	import EnableBuyBonusWarmLifecycle from './EnableBuyBonusWarmLifecycle.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import EnableBoardIdleBounce from './EnableBoardIdleBounce.svelte';
	import EnableSpinSceneReaction from './EnableSpinSceneReaction.svelte';
	import EnableLivingIdle from './EnableLivingIdle.svelte';
	import EnablePauseMainPixiOnBuyBonus from './EnablePauseMainPixiOnBuyBonus.svelte';
	import EnableDuelPhoneDpr from './EnableDuelPhoneDpr.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import EntranceCameraShake from './EntranceCameraShake.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import Board from './Board.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BoardIdleBounceLayer from './BoardIdleBounceLayer.svelte';
	import BoardPawCoinLayer from './BoardPawCoinLayer.svelte';
	import BoardFullColumnLayer from './BoardFullColumnLayer.svelte';
	import PaylineLayer from './PaylineLayer.svelte';
	import SuperWildCurtainPixi from './SuperWildCurtainPixi.svelte';
	import Win from './Win.svelte';
	import MascotPixi from './MascotPixi.svelte';
	import SpinButtonPixiLayer from './SpinButtonPixiLayer.svelte';
	import PawCoinPixiLayer from './PawCoinPixiLayer.svelte';
	import TargetShotBulletPixiLayer from './TargetShotBulletPixiLayer.svelte';
	import TargetFlipPixiLayer from './TargetFlipPixiLayer.svelte';
	import RevolverDrumPlaceholder from './RevolverDrumPlaceholder.svelte';
	import RevolverDrumPixi from './RevolverDrumPixi.svelte';
	import { devPreview } from '../game/devPreview.svelte';
	import TargetBoardOverlay from './TargetBoardOverlay.svelte';
	import TargetPickOverlay from './TargetPickOverlay.svelte';
	import ExportCardsPickOverlay from './ExportCardsPickOverlay.svelte';
	import TargetPickPixiLayer from './TargetPickPixiLayer.svelte';
	import TargetShootOverlay from './TargetShootOverlay.svelte';
	import TargetShootDevOverlay from './TargetShootDevOverlay.svelte';
	import TargetShotTrailHtml from './TargetShotTrailHtml.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinCounterPortraitHtml from './FreeSpinCounterPortraitHtml.svelte';
	import BoardNeonLogoHtmlOverlay from './BoardNeonLogoHtmlOverlay.svelte';
	import WinHudHtmlOverlay from './WinHudHtmlOverlay.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import DuelModeOverlay from './DuelModeOverlay.svelte';
	import DuelIntro from './DuelIntro.svelte';
	import DuelPixiBoard from './DuelPixiBoard.svelte';
	import FeaturesAutoSpinOverlay from './FeaturesAutoSpinOverlay.svelte';
	import CashStacksMenuOverlay from './CashStacksMenuOverlay.svelte';
	import CashStacksBuyBonusPanel from './CashStacksBuyBonusPanel.svelte';
	import CashStacksDesktopHudOverlay from './CashStacksDesktopHudOverlay.svelte';
	import CashStacksPortraitHudOverlay from './CashStacksPortraitHudOverlay.svelte';
	import MascotPressHtmlOverlay from './MascotPressHtmlOverlay.svelte';
	import DevCheats from './DevCheats.svelte';
	import DevButtons from './DevButtons.svelte';
	import ExportCardsDevOverlay from './ExportCardsDevOverlay.svelte';
	import PixiTextureMemoryOverlay from './PixiTextureMemoryOverlay.svelte';
	import PixiFpsOverlay from './PixiFpsOverlay.svelte';
	import { FadeContainer } from 'components-pixi';

	/** Flip to `false` and comment the dev imports + markup below to hide the dev menu. */
	const SHOW_DEV_UI = true;

	const context = getContext();
	const phoneTickerMaxFps = isPhoneForAtlasDownscale() ? PHONE_TICKER_MAX_FPS : undefined;

	let BuyBonusModalShell = $state<Component | null>(null);

	onMount(() => {
		// HMR remounts this component. Heal interrupted entrance so Space-spin
		// is not left gated on a stale `liftComplete === false`.
		if (gameEntrance.liftComplete) {
			context.stateLayout.showLoadingScreen = false;
			return;
		}
		if (gameEntrance.showContent && !gameEntrance.loadingCardsVisible) {
			gameEntrance.liftComplete = true;
			gameEntrance.loaderExitActive = false;
			context.stateLayout.showLoadingScreen = false;
			return;
		}
		context.stateLayout.showLoadingScreen = true;
	});

	$effect(() => {
		if (BuyBonusModalShell) return;
		// Prefetch as soon as the game is playable so the first Buy Bonus tap isn’t a no-op.
		if (!context.stateApp.loaded && !gameEntrance.showContent) return;
		void import('./BuyBonusModalShell.svelte').then((mod) => {
			BuyBonusModalShell = mod.default;
		});
	});

	/**
	 * SW curtain normally sits above gold rails. While the board parks under the
	 * desk for target-pick, tuck it under BoardFrame overlay + target cabinet
	 * (same stack as reel symbols) so it does not slide over the фон.
	 */
	const superWildCurtainZ = $derived(
		stateGame.targetPickOpen || stateGame.targetPickSlide > 0 ? -2 : -0.25,
	);

	// Storybook / skipLoadingScreen: reveal game without the loading flow.
	$effect(() => {
		if (!context.stateLayout.showLoadingScreen) {
			gameEntrance.preloadContent = true;
			gameEntrance.showContent = true;
			gameEntrance.liftComplete = true;
			gameEntrance.bootstrapDismissed = true;
		}
	});

	$effect(() => {
		// Warm HUD HTML during cards idle (or after skip-loading), not on Continue tap.
		if (!context.stateApp.loaded) return;
		if (gameEntrance.loadingCardsVisible || gameEntrance.liftComplete) {
			startLoadingIdleUiPreload();
		}
	});

	const canvasHeightNow = () =>
		context.stateLayoutDerived.canvasSizes().height ||
		(typeof window !== 'undefined' ? window.innerHeight : 720);

	const finishEntrance = () => {
		restEntranceReveal();
		gameEntrance.loaderExitActive = false;
		gameEntrance.introFading = false;
		gameEntrance.loadingCardsVisible = false;
		gameEntrance.showContent = true;
		gameEntrance.liftComplete = true;
		context.stateLayout.showLoadingScreen = false;
		clearHtmlPreloadMemoryRegistry([
			...LOADER_SCREEN_IMAGE_URLS,
			...loaderScreenImageUrls(),
			LOADER_CARD_2_SOCIAL_IMAGE_URL,
		]);
	};

	/**
	 * Press to continue. The room spine is already on this stage and keeps
	 * playing. Cards fade, chrome eases in, the board drops onto its pose.
	 * Do NOT set transitionActive — that hides the mascot for feature steam.
	 */
	$effect(() => {
		if (!gameEntrance.loaderExitActive || gameEntrance.liftComplete) return;

		let cancelled = false;
		let raf = 0;

		untrack(() => {
			gameEntrance.showContent = true;
			entranceReveal.driving = true;
			applyEntranceFrame(0, canvasHeightNow());
		});

		const start = performance.now();
		const tick = (now: number) => {
			if (cancelled || gameEntrance.liftComplete) return;
			const elapsed = now - start;
			const timelineMs = entranceTimelineMs();
			if (elapsed >= timelineMs) {
				applyEntranceFrame(timelineMs, canvasHeightNow());
				// One frame at the rest pose so mascot alpha is copied before unlock.
				raf = requestAnimationFrame(() => {
					if (cancelled || gameEntrance.liftComplete) return;
					finishEntrance();
				});
				return;
			}
			applyEntranceFrame(elapsed, canvasHeightNow());
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);

		return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
			// Finish already parks the pose before liftComplete. Any other exit
			// (dev reset, remount) must not leave the board offset in mid-air.
			if (entranceReveal.driving) restEntranceReveal();
		};
	});

	context.eventEmitter.subscribeOnMount({
		buyBonusConfirm: () => {
			stateModal.modal = { name: 'buyBonusConfirm' };
		},
	});
</script>

<!--
  Bind stacking directly to state (no $effect lag). A delayed drop of Pixi
  after the cloud ends left the opaque canvas over the drum for a frame → pop-in.
  Raise Pixi for FS cloud + Total Win. Big-win keeps HTML HUD above (CSS-dimmed).
-->
<div
	class="pixi-stage"
	class:above-html-ui={context.stateGame.transitionCoversUi || context.stateGame.fsOutroActive}
>
	<GameApp
		maxResolution={3}
		antialias={false}
		tuneForMobilePortrait
		webglOnIosAndroid
		maxFps={phoneTickerMaxFps}
	>
		{#snippet early()}
			<EntranceCameraShake />
			<Background />
		{/snippet}
		<EnableSound />
		<EnableSymbolTextureOptimization />
		<EnableSymbolCellFit />
		<EnableUiTextureOptimization />
		<EnablePhoneSpineAtlasDownscale />
		<EnableMascotCatSkinMemory />
		<EnableTirGpuMemory />
		<EnableFeatureGpuMemory />
		<EnableCanvasTextGpuGuard />
		<EnableBuyBonusWarmLifecycle />
		<EnableHotkey />
		<EnableGameActor />
		<EnableBoardIdleBounce />
		<EnableSpinSceneReaction />
		<EnableLivingIdle />
		<EnablePauseMainPixiOnBuyBonus />
		<EnablePixiExtension />
		<EnableDuelPhoneDpr />

		{#if gameEntrance.preloadContent}
			<!--
				Sort stage siblings so remounting the cat (pose / skin) cannot climb
				above Big Win / Total Win. Board < mascot(6) < overlays(10) < steam(1000).
			-->
			<Container sortableChildren>
			<ResumeBet />
			{#if gameEntrance.showContent || gameEntrance.loaderExitActive}
				<!--
				Autoplay with sound is allowed after user interaction on the loading screen.
				Ref: https://developer.chrome.com/blog/autoplay
			-->
				<Sound />
			{/if}

			<!--
				Board stays mounted (persistent) under the cards at alpha 0.
				On Continue it drops in from above; the room spine is not part of this fade.
			-->
			<FadeContainer
				show={gameEntrance.showContent}
				duration={0}
				persistent
				sortableChildren
				zIndex={0}
			>
				{#if stateDuel.active || stateDuel.prebuild || stateDuel.linger}
					<!-- Paint order matches base: bases → reels → gold rails →
					     win pops → SW curtains → nameplate → paylines → win text.
					     Prebuild draws this off-screen so the steam clip
					     only slides it into place. -->
					<Container
						x={stateDuel.active ? 0 : -40000}
						visible={stateDuel.active ||
							(stateDuel.prebuild && !context.stateGame.transitionActive)}
					>
					{#if stateDuel.visualTier >= 1}
						<DuelPixiBoard side="dog" layer="base" />
						<DuelPixiBoard side="cat" layer="base" />
						<DuelPixiBoard side="dog" layer="board" />
						<DuelPixiBoard side="cat" layer="board" />
					{/if}
					{#if stateDuel.visualTier >= 2}
						<DuelPixiBoard side="dog" layer="idleBounce" />
						<DuelPixiBoard side="cat" layer="idleBounce" />
					{/if}
					{#if stateDuel.visualTier >= 3}
						<DuelPixiBoard side="dog" layer="overlay" />
						<DuelPixiBoard side="cat" layer="overlay" />
					{/if}
					{#if stateDuel.visualTier >= 5}
						<DuelPixiBoard side="dog" layer="superWild" />
						<DuelPixiBoard side="cat" layer="superWild" />
						<!-- Desk stamp above SW curtains / symbols, under paylines. -->
						<DuelPixiBoard side="dog" layer="nameplate" />
						<DuelPixiBoard side="cat" layer="nameplate" />
						<DuelPixiBoard side="dog" layer="paylines" />
						<DuelPixiBoard side="cat" layer="paylines" />
					{/if}
					</Container>
				{/if}
				{#if !stateDuel.active || stateGame.baseLinger}
					<Container
						x={stateDuel.active ? -40000 : 0}
						y={entranceReveal.boardOffsetY}
						visible={!stateDuel.active || stateGame.baseWarm}
					>
					{#if stateGame.baseVisualTier >= 1}
						<Container zIndex={-3}>
							<MainContainer>
								<BoardFrame layer="base" />
							</MainContainer>
						</Container>

						<Container zIndex={-2}>
							<MainContainer>
								<Board />
							</MainContainer>
						</Container>
					{/if}

					{#if stateGame.baseVisualTier >= 2}
						<!-- Full slot spine (frame + gold lines). -->
						<Container zIndex={-1}>
							<MainContainer>
								<BoardFrame layer="overlay" />
							</MainContainer>
						</Container>

						<!-- Target cabinet above the spine, clipped to the inner window. -->
						<Container zIndex={-0.85}>
							<MainContainer>
								<TargetPickPixiLayer />
							</MainContainer>
						</Container>

						<Container zIndex={-0.5}>
							<MainContainer>
								<BoardIdleBounceLayer />
								<BoardPawCoinLayer />
								<BoardFullColumnLayer />
							</MainContainer>
						</Container>
					{/if}

					{#if stateGame.baseVisualTier >= 3}
						<!-- SW curtain above reels/rails; under nameplate so the WIN plate covers curtain feet.
						     During target-pick drop → z -2 (under desk overlay / фон). -->
						<Container zIndex={superWildCurtainZ}>
							<MainContainer>
								<BoardContainer>
									<SuperWildCurtainPixi />
								</BoardContainer>
							</MainContainer>
						</Container>

						<!-- Desk wax stamp — above symbols / win pops / SW curtains, under paylines / WIN $. -->
						<Container zIndex={-0.1}>
							<MainContainer>
								<BoardFrame layer="nameplate" />
							</MainContainer>
						</Container>

						<Container zIndex={0}>
							<MainContainer>
								<PaylineLayer />
							</MainContainer>
						</Container>

						<!-- WIN $ text above the nameplate art. -->
						<Container zIndex={1}>
							<UiCashStacksLayout />
						</Container>
					{/if}
					</Container>
				{/if}
				<!-- Paw coins under mascot so the hat / hand occlude the fly. -->
				<PawCoinPixiLayer zIndex={5} />
			</FadeContainer>
			<!--
				Cat is outside the board fade: he is already on the opening screen
				while the desk stays hidden, then stays put as the board drops.
				Keep below Big Win / Total Win (overlays FadeContainer zIndex 10).
			-->
			<MascotPixi zIndex={6} />
			<!-- HUD spin on main WebGL; HTML button is a transparent hit above. -->
			<SpinButtonPixiLayer zIndex={7} />
			<FadeContainer
				show={gameEntrance.showContent}
				duration={0}
				persistent
				sortableChildren
				zIndex={10}
			>
				<!-- Tir FX above target holders + flip discs. -->
				<TargetShotBulletPixiLayer zIndex={93} />
				<TargetFlipPixiLayer zIndex={91} />
				<!-- Under Transition (1000) + FS outro / Win coins (10); above mascot (6). -->
				<RevolverDrumPixi
					zIndex={8}
					forceShow={devPreview.forceShowDrum || devPreview.forceShowFsBoardChrome}
				/>
				<!-- Keep Win mounted during Duel so Big Win can play on Cat victory. -->
				<Win />
			</FadeContainer>
			</Container>
		{/if}
		<!-- Always mounted so freeSpinEnd Show/CountUp/transition always have handlers. -->
		<FreeSpinOutro />
		<Transition />
	</GameApp>
</div>

<div class="scene-html" style:scale={entranceCameraCssScale()}>
<CashStacksModals>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
</CashStacksModals>

<FeaturesAutoSpinOverlay />
<CashStacksBuyBonusPanel />
<CashStacksDesktopHudOverlay />
<CashStacksPortraitHudOverlay />
<MascotPressHtmlOverlay />
<CashStacksMenuOverlay />
{#if BuyBonusModalShell}
	<BuyBonusModalShell />
{/if}
<div class="html-underlays">
	<RevolverDrumPlaceholder />
</div>
<FreeSpinCounter />
<FreeSpinCounterPortraitHtml />
<BoardNeonLogoHtmlOverlay />
<WinHudHtmlOverlay />
<!-- Duel HTML chrome (pick / counters / outro). Desks + mascots + paw coins are Pixi. -->
<DuelModeOverlay />
<DuelIntro />
<TargetBoardOverlay />
<TargetPickOverlay />
<ExportCardsPickOverlay />
<TargetShootOverlay />
{#if SHOW_DEV_UI}
	<TargetShootDevOverlay />
{/if}
<TargetShotTrailHtml />
<FreeSpinIntro />
{#if SHOW_DEV_UI}
	<DevCheats />
	<DevButtons />
	<ExportCardsDevOverlay />
	<PixiTextureMemoryOverlay />
	<PixiFpsOverlay />
{/if}
</div>

<style lang="scss">
	.pixi-stage {
		position: relative;
	}

	/* Same camera zoom as the WebGL stage. Scale is set only during the hit. */
	.scene-html {
		position: absolute;
		inset: 0;
		pointer-events: none;
		transform-origin: 50% 50%;
	}

	.scene-html :global(button),
	.scene-html :global(a),
	.scene-html :global(input),
	.scene-html :global(select),
	.scene-html :global(textarea),
	.scene-html :global(label),
	.scene-html :global(.dev-panel) {
		pointer-events: auto;
	}

	/* HUD (z-index 40–48); FreeSpinIntro / tir HTML ~60–72; menus ~9998–10001.
	   Transition (+ FS Total Win) must sit above all of those for the full spine. */
	.html-underlays {
		position: relative;
		z-index: 40;
	}

	.pixi-stage.above-html-ui {
		z-index: 50000;
	}

	/* Opaque plate so translucent WebGL cannot ghost HTML chrome underneath. */
	.pixi-stage.above-html-ui :global(canvas) {
		background-color: #000;
	}

</style>
