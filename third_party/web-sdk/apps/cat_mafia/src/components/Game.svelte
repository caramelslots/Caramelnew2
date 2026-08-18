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
	import EnableSound from './EnableSound.svelte';
	import EnableSymbolTextureOptimization from './EnableSymbolTextureOptimization.svelte';
	import EnableUiTextureOptimization from './EnableUiTextureOptimization.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import EnableBoardIdleBounce from './EnableBoardIdleBounce.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoaderCardsHtmlOverlay from './LoaderCardsHtmlOverlay.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import Board from './Board.svelte';
	import Win from './Win.svelte';
	import MascotPlaceholder from './MascotPlaceholder.svelte';
	import RevolverDrumPlaceholder from './RevolverDrumPlaceholder.svelte';
	import BulletFlyOverlay from './BulletFlyOverlay.svelte';
	import { devPreview } from '../game/devPreview.svelte';
	import PawCoinOverlay from './PawCoinOverlay.svelte';
	import SuperWildCurtainOverlay from './SuperWildCurtainOverlay.svelte';
	import TargetPickOverlay from './TargetPickOverlay.svelte';
	import TargetShootOverlay from './TargetShootOverlay.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
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

	// While idle-tease pops run, the gold frame drops under the board so bouncing
	// symbols render over the rails instead of clipping against them (the rails
	// stay on top whenever reels spin/land — idle bounce never runs then).
	const idlePopping = $derived(context.stateGameDerived.boardIdleBouncing());

	// FS cloud transition: the pixi-stage z-flip above the HTML mascot layer is
	// delayed by the mascot fade-out (MASCOT_TRANSITION_FADE_MS) so the mascot
	// dissolves under the incoming cloud instead of popping behind the opaque
	// board in one frame. Drops back instantly when the transition ends (the
	// mascot is at opacity 0 then and fades back in on its own). winOverlayActive
	// keeps the immediate flip — big-win behaviour unchanged.
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

<div
	class="pixi-stage"
	class:above-html-ui={pixiAboveHtml || context.stateGame.winOverlayActive}
>
	<GameApp maxResolution={3} tuneForMobilePortrait webglOnIosAndroid>
		<EnableSound />
		<EnableSymbolTextureOptimization />
		<EnableUiTextureOptimization />
		<EnableHotkey />
		<EnableGameActor />
		<EnableBoardIdleBounce />
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

			<FadeContainer show={gameEntrance.showContent} duration={GAME_ENTRANCE_MS} persistent sortableChildren>
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

				<!-- Gold rails above symbols so spin/land never paints over the frame;
				     drops under the board during idle-tease pops (idlePopping). -->
				<Container zIndex={idlePopping ? -2.5 : -1}>
					<MainContainer>
						<BoardFrame layer="overlay" />
					</MainContainer>
				</Container>

				<UiCashStacksLayout>
					{#snippet gameName()}
						<UiGameName name="Cat Mafia" />
					{/snippet}
				</UiCashStacksLayout>
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
<!-- Below HUD (z44) / Buy Bonus (z45); outside .html-underlays (z40). -->
<div class="html-mascot-layer">
	<MascotPlaceholder />
	<PawCoinOverlay />
</div>
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

	/* Mascot + paw coins under HUD overlays (z44) and Buy Bonus (z45). */
	.html-mascot-layer {
		position: relative;
		z-index: 42;
		pointer-events: none;
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
