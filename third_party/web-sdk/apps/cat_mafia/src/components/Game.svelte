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
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { startLoadingIdleUiPreload } from '../game/uiHtmlAssetManifest';
	import { GAME_ENTRANCE_MS, MASCOT_TRANSITION_FADE_MS } from '../game/constants';
	import { stateDuel } from '../game/stateDuel.svelte';
	import EnableSound from './EnableSound.svelte';
	import EnableSymbolTextureOptimization from './EnableSymbolTextureOptimization.svelte';
	import EnableUiTextureOptimization from './EnableUiTextureOptimization.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import EnableBoardIdleBounce from './EnableBoardIdleBounce.svelte';
	import EnableLivingIdle from './EnableLivingIdle.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoaderCardsHtmlOverlay from './LoaderCardsHtmlOverlay.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import Board from './Board.svelte';
	import BoardIdleBounceLayer from './BoardIdleBounceLayer.svelte';
	import PaylineLayer from './PaylineLayer.svelte';
	import Win from './Win.svelte';
	import MascotPixi from './MascotPixi.svelte';
	import PawCoinPixiLayer from './PawCoinPixiLayer.svelte';
	import RevolverDrumPlaceholder from './RevolverDrumPlaceholder.svelte';
	import BulletFlyOverlay from './BulletFlyOverlay.svelte';
	import { devPreview } from '../game/devPreview.svelte';
	import SuperWildCurtainOverlay from './SuperWildCurtainOverlay.svelte';
	import TargetPickOverlay from './TargetPickOverlay.svelte';
	import TargetShootOverlay from './TargetShootOverlay.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import DuelModeOverlay from './DuelModeOverlay.svelte';
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

	// FS cloud transition: raise Pixi above HTML chrome after the mascot
	// fade-out (MASCOT_TRANSITION_FADE_MS). Mascot + paw coins are Pixi and
	// fade / sit under Transition. winOverlayActive keeps the immediate flip.
	let pixiAboveHtml = $state(false);

	$effect(() => {
		if (!context.stateGame.transitionActive) {
			pixiAboveHtml = false;
			return;
		}
		const timer = setTimeout(() => (pixiAboveHtml = true), MASCOT_TRANSITION_FADE_MS);
		return () => clearTimeout(timer);
	});

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

<div class="pixi-stage" class:above-html-ui={pixiAboveHtml || context.stateGame.winOverlayActive}>
	<GameApp maxResolution={3} tuneForMobilePortrait webglOnIosAndroid>
		<EnableSound />
		<EnableSymbolTextureOptimization />
		<EnableUiTextureOptimization />
		<EnableHotkey />
		<EnableGameActor />
		<EnableBoardIdleBounce />
		<EnableLivingIdle />
		<EnablePixiExtension />

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
					<!-- Paint order matches base: bases → reels → gold rails → paylines → win. -->
					<DuelPixiBoard side="dog" layer="base" />
					<DuelPixiBoard side="cat" layer="base" />
					<DuelPixiBoard side="dog" layer="board" />
					<DuelPixiBoard side="cat" layer="board" />
					<DuelPixiBoard side="dog" layer="overlay" />
					<DuelPixiBoard side="cat" layer="overlay" />
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

					<!-- Gold rails above resting symbols. Idle-tease pops render in the
					     next layer so they can overlap the frame without lifting the
					     whole board (that let idle spines like the phone paint through). -->
					<Container zIndex={-1}>
						<MainContainer>
							<BoardFrame layer="overlay" />
						</MainContainer>
					</Container>

					<Container zIndex={-0.5}>
						<MainContainer>
							<BoardIdleBounceLayer />
						</MainContainer>
					</Container>

					<Container zIndex={0}>
						<MainContainer>
							<PaylineLayer />
						</MainContainer>
					</Container>

					<UiCashStacksLayout>
						{#snippet gameName()}
							<UiGameName name="Cat Mafia" />
						{/snippet}
					</UiCashStacksLayout>
				{/if}
				<!-- Paw coins under mascot so the hat / hand occlude the fly. -->
				<PawCoinPixiLayer zIndex={5} />
				<!-- Pixi mascot above boards + coins; under Win / Transition. -->
				<MascotPixi zIndex={6} />
				<MascotPixi variant="duelDog" zIndex={6} />
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
	<RevolverDrumPlaceholder forceShow={devPreview.forceShowDrum} />
	<BulletFlyOverlay />
	<SuperWildCurtainOverlay />
</div>
<!-- Duel HTML chrome (pick / counters / outro). Desks + mascots + paw coins are Pixi. -->
<DuelModeOverlay />
<TargetPickOverlay />
<TargetShootOverlay />
<FreeSpinIntro />
<DevCheats />
<DevButtons />

<style lang="scss">
	.pixi-stage {
		position: relative;
	}

	/* HUD (z-index 40–45); raise Pixi during cloud transition or win overlay. */
	.html-underlays {
		position: relative;
		z-index: 40;
	}

	.pixi-stage.above-html-ui {
		z-index: 50;
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
