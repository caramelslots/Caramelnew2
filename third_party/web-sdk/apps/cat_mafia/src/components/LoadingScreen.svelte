<script lang="ts">
	import { OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { LOADER_EXIT_CARDS_DURATION_MS } from '../game/constants';
	import { startLoadingIdleUiPreload } from '../game/uiHtmlAssetManifest';
	import LoaderExitOverlay from './LoaderExitOverlay.svelte';

	type Props = {
		onloaded: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	const exitOverlayArmed = $derived(
		context.stateApp.loaded && context.stateLayout.showLoadingScreen,
	);

	// Warm up board symbols / frame textures while the player reads "press to continue".
	$effect(() => {
		if (context.stateApp.loaded) {
			gameEntrance.preloadContent = true;
			startLoadingIdleUiPreload();
		}
	});

	const onExitComplete = () => {
		gameEntrance.loaderExitActive = false;
		gameEntrance.loadingCardsVisible = false;
		props.onloaded();
	};

	const startLoadingTransition = () => {
		if (gameEntrance.loaderExitActive) return;

		gameEntrance.loadingCardsVisible = false;
		gameEntrance.loaderExitActive = true;
		gameEntrance.hideLoaderStreet = true;
		gameEntrance.showContent = true;

		void waitForTimeout(LOADER_EXIT_CARDS_DURATION_MS).then(onExitComplete);
	};

	const canContinue = $derived(
		context.stateApp.loaded && gameEntrance.loadingCardsVisible && !gameEntrance.loaderExitActive,
	);
</script>

<!-- Label is HTML (LoaderCardsHtmlOverlay) so it sits above LoaderStreetStill. -->
{#if canContinue}
	<OnHotkey hotkey="Space" onpress={startLoadingTransition} />
	<OnPressFullScreen onpress={startLoadingTransition} />
{/if}

{#if exitOverlayArmed}
	<LoaderExitOverlay exiting={gameEntrance.loaderExitActive} />
{/if}
