<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App } from 'pixi-svelte';
	import { stateModal } from 'state-shared';

	import { UiGameName } from 'components-ui-pixi';
	import { GameVersion } from 'components-ui-html';
	import UiCashStacksLayout from './UiCashStacksLayout.svelte';
	import CashStacksModals from './CashStacksModals.svelte';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { startLoadingIdleUiPreload } from '../game/uiHtmlAssetManifest';
	import { GAME_ENTRANCE_MS } from '../game/constants';
	import EnableSound from './EnableSound.svelte';
	import EnableSymbolTextureOptimization from './EnableSymbolTextureOptimization.svelte';
	import EnableUiTextureOptimization from './EnableUiTextureOptimization.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoaderCardsHtmlOverlay from './LoaderCardsHtmlOverlay.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import Board from './Board.svelte';
	// Anticipations removed (REDESIGN_PLAN §2.4): эффект полностью отключён,
	// math не эмитит anticipation > 0. Компонент оставлен в репо для отката.
	import ProgressLadder from './ProgressLadder.svelte';
	import MysteryReelUnlockOverlay from './MysteryReelUnlockOverlay.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import FeaturesAutoSpinOverlay from './FeaturesAutoSpinOverlay.svelte';
	import CashStacksMenuOverlay from './CashStacksMenuOverlay.svelte';
	import BuyBonusModalShell from './BuyBonusModalShell.svelte';
	import AutoplayMessageModalShell from './AutoplayMessageModalShell.svelte';
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

<div
	class="pixi-stage"
	class:above-html-ui={context.stateGame.transitionActive || context.stateGame.winOverlayActive}
>
	<App maxResolution={3} tuneForMobilePortrait>
		<EnableSound />
		<EnableSymbolTextureOptimization />
		<EnableUiTextureOptimization />
		<EnableHotkey />
		<EnableGameActor />
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

			<FadeContainer show={gameEntrance.showContent} duration={GAME_ENTRANCE_MS} persistent>
				<MainContainer>
					<BoardFrame />
				</MainContainer>

				<MainContainer>
					<Board />
				</MainContainer>

				<UiCashStacksLayout>
					{#snippet gameName()}
						<UiGameName name="Wok Fury" />
					{/snippet}
				</UiCashStacksLayout>
				<Win />
			<FreeSpinCounter />
				<FreeSpinOutro />
				<Transition />
			</FadeContainer>
		{/if}
	</App>
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
<AutoplayMessageModalShell />
<div class="html-underlays">
	<ProgressLadder />
</div>
<MysteryReelUnlockOverlay />
<FreeSpinIntro />
<DevCheats />
<DevButtons />

<style lang="scss">
	.pixi-stage {
		position: relative;
	}

	/* ProgressLadder / buy-bonus HUD (z-index 40–45); raise Pixi during cloud transition or win overlay. */
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
