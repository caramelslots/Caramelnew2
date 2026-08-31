<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import GameApp from './GameApp.svelte';
	import { stateModal } from 'state-shared';

	import { UiGameName } from 'components-ui-pixi';
	import { GameVersion } from 'components-ui-html';
	import { Container } from 'pixi-svelte';
	import UiCashStacksLayout from './UiCashStacksLayout.svelte';
	import CashStacksModals from './CashStacksModals.svelte';

	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { startLoadingIdleUiPreload } from '../game/uiHtmlAssetManifest';
	import { GAME_ENTRANCE_MS } from '../game/constants';
	import { stateDuel } from '../game/stateDuel.svelte';
	import EnableSound from './EnableSound.svelte';
	import EnableSymbolTextureOptimization from './EnableSymbolTextureOptimization.svelte';
	import EnableSymbolCellFit from './EnableSymbolCellFit.svelte';
	import EnableUiTextureOptimization from './EnableUiTextureOptimization.svelte';
	import EnablePhoneSpineAtlasDownscale from './EnablePhoneSpineAtlasDownscale.svelte';
	import EnableMascotCatSkinMemory from './EnableMascotCatSkinMemory.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import EnableBoardIdleBounce from './EnableBoardIdleBounce.svelte';
	import EnableLivingIdle from './EnableLivingIdle.svelte';
	import EnableDuelPhoneDpr from './EnableDuelPhoneDpr.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoaderCardsHtmlOverlay from './LoaderCardsHtmlOverlay.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import Board from './Board.svelte';
	import BoardIdleBounceLayer from './BoardIdleBounceLayer.svelte';
	import BoardPawCoinLayer from './BoardPawCoinLayer.svelte';
	import PaylineLayer from './PaylineLayer.svelte';
	import Win from './Win.svelte';
	import MascotPixi from './MascotPixi.svelte';
	import PawCoinPixiLayer from './PawCoinPixiLayer.svelte';
	import TargetShotBulletPixiLayer from './TargetShotBulletPixiLayer.svelte';
	import TargetFlipPixiLayer from './TargetFlipPixiLayer.svelte';
	import RevolverDrumPlaceholder from './RevolverDrumPlaceholder.svelte';
	import RevolverDrumPixi from './RevolverDrumPixi.svelte';
	import { devPreview } from '../game/devPreview.svelte';
	import SuperWildCurtainOverlay from './SuperWildCurtainOverlay.svelte';
	import TargetBoardOverlay from './TargetBoardOverlay.svelte';
	import TargetPickOverlay from './TargetPickOverlay.svelte';
	import TargetPickPixiLayer from './TargetPickPixiLayer.svelte';
	import TargetShootOverlay from './TargetShootOverlay.svelte';
	import TargetShotTrailHtml from './TargetShotTrailHtml.svelte';
	import TargetFlipLabelHtml from './TargetFlipLabelHtml.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import DuelModeOverlay from './DuelModeOverlay.svelte';
	import DuelIntro from './DuelIntro.svelte';
	import DuelPixiBoard from './DuelPixiBoard.svelte';
	import FeaturesAutoSpinOverlay from './FeaturesAutoSpinOverlay.svelte';
	import CashStacksMenuOverlay from './CashStacksMenuOverlay.svelte';
	import BuyBonusModalShell from './BuyBonusModalShell.svelte';
	import CashStacksBuyBonusPanel from './CashStacksBuyBonusPanel.svelte';
	import CashStacksDesktopHudOverlay from './CashStacksDesktopHudOverlay.svelte';
	import CashStacksPortraitHudOverlay from './CashStacksPortraitHudOverlay.svelte';
	import DevCheats from './DevCheats.svelte';
	import DevButtons from './DevButtons.svelte';
	import { FadeContainer } from 'components-pixi';

	const context = getContext();

	onMount(() => (context.stateLayout.showLoadingScreen = true));

	// Storybook / skipLoadingScreen: reveal game without the loading flow.
	$effect(() => {
		if (!context.stateLayout.showLoadingScreen) {
			gameEntrance.preloadContent = true;
			gameEntrance.showContent = true;
			startLoadingIdleUiPreload();
		}
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
-->
<div
	class="pixi-stage"
	class:above-html-ui={context.stateGame.transitionActive ||
		context.stateGame.winOverlayActive ||
		gameEntrance.loadingCloudActive}
>
	<GameApp maxResolution={3} tuneForMobilePortrait webglOnIosAndroid>
		<EnableSound />
		<EnableSymbolTextureOptimization />
		<EnableSymbolCellFit />
		<EnableUiTextureOptimization />
		<EnablePhoneSpineAtlasDownscale />
		<EnableMascotCatSkinMemory />
		<EnableHotkey />
		<EnableGameActor />
		<EnableBoardIdleBounce />
		<EnableLivingIdle />
		<EnablePixiExtension />
		<EnableDuelPhoneDpr />

		<Background />

		{#if context.stateLayout.showLoadingScreen}
			<LoadingScreen onloaded={() => (context.stateLayout.showLoadingScreen = false)} />
		{/if}

		{#if gameEntrance.preloadContent}
			<ResumeBet />
			{#if gameEntrance.showContent}
				<!--
				Autoplay with sound is allowed after user interaction on the loading screen.
				Ref: https://developer.chrome.com/blog/autoplay
			-->
				<Sound />
			{/if}

			<FadeContainer
				show={gameEntrance.showContent}
				duration={GAME_ENTRANCE_MS}
				persistent
				sortableChildren
			>
				{#if stateDuel.active}
					<!-- Paint order matches base: bases → reels → gold rails →
					     nameplate → win pops → paylines → win text. -->
					<DuelPixiBoard side="dog" layer="base" />
					<DuelPixiBoard side="cat" layer="base" />
					<DuelPixiBoard side="dog" layer="board" />
					<DuelPixiBoard side="cat" layer="board" />
					<DuelPixiBoard side="dog" layer="overlay" />
					<DuelPixiBoard side="cat" layer="overlay" />
					<DuelPixiBoard side="dog" layer="nameplate" />
					<DuelPixiBoard side="cat" layer="nameplate" />
					<DuelPixiBoard side="dog" layer="idleBounce" />
					<DuelPixiBoard side="cat" layer="idleBounce" />
					<DuelPixiBoard side="dog" layer="paylines" />
					<DuelPixiBoard side="cat" layer="paylines" />
					<DuelPixiBoard side="dog" layer="win" />
					<DuelPixiBoard side="cat" layer="win" />
				{:else}
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

					<!-- WIN sum plate — above the cabinet. -->
					<Container zIndex={-0.75}>
						<MainContainer>
							<BoardFrame layer="nameplate" />
						</MainContainer>
					</Container>

					<Container zIndex={-0.5}>
						<MainContainer>
							<BoardIdleBounceLayer />
							<BoardPawCoinLayer />
						</MainContainer>
					</Container>

					<Container zIndex={0}>
						<MainContainer>
							<PaylineLayer />
						</MainContainer>
					</Container>

					<!-- WIN $ text above the nameplate art. -->
					<Container zIndex={1}>
						<UiCashStacksLayout>
							{#snippet gameName()}
								<UiGameName name="Cat Mafia" />
							{/snippet}
						</UiCashStacksLayout>
					</Container>
				{/if}
				<!-- Paw coins under mascot so the hat / hand occlude the fly. -->
				<PawCoinPixiLayer zIndex={5} />
				<!-- Pixi mascot above boards + coins; under Win / Transition. -->
				<MascotPixi zIndex={6} />
				<!-- Dog atlas is heavy — mount only while duel is live (not portrait). -->
				{#if stateDuel.active}
					<MascotPixi variant="duelDog" zIndex={6} />
				{/if}
				<!-- Tir FX above board HTML while flight/flip runs (stage lifted). -->
				<TargetShotBulletPixiLayer zIndex={90} />
				<TargetFlipPixiLayer zIndex={91} />
				<!-- Under Transition (100) + FS outro / Win coins (10); above board. -->
				<RevolverDrumPixi
					zIndex={8}
					forceShow={devPreview.forceShowDrum || devPreview.forceShowFsBoardChrome}
				/>
				<!-- Keep Win mounted during Duel so Big Win can play on Cat victory. -->
				<Win />
				<FreeSpinCounter />
				<FreeSpinOutro />
				<Transition />
			</FadeContainer>
		{/if}
	</GameApp>
</div>

<LoaderCardsHtmlOverlay />

<CashStacksModals>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
</CashStacksModals>

<FeaturesAutoSpinOverlay />
<CashStacksBuyBonusPanel />
<CashStacksDesktopHudOverlay />
<CashStacksPortraitHudOverlay />
<CashStacksMenuOverlay />
<BuyBonusModalShell />
<div class="html-underlays">
	<RevolverDrumPlaceholder />
	<SuperWildCurtainOverlay />
</div>
<!-- Duel HTML chrome (pick / counters / outro). Desks + mascots + paw coins are Pixi. -->
<DuelModeOverlay />
<DuelIntro />
<TargetBoardOverlay />
<TargetPickOverlay />
<TargetShootOverlay />
<TargetShotTrailHtml />
<TargetFlipLabelHtml />
<FreeSpinIntro />
<DevCheats />
<DevButtons />

<style lang="scss">
	.pixi-stage {
		position: relative;
	}

	/* HUD (z-index 40–45); raise Pixi only for cloud / win (not tir FX — that hid HUD). */
	.html-underlays {
		position: relative;
		z-index: 40;
	}

	.pixi-stage.above-html-ui {
		z-index: 100;
	}

	:global(.daloniil-ui-enter) {
		animation: daloniil-ui-enter 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes daloniil-ui-enter {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}
</style>
