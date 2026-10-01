<script lang="ts">
	import { OnHotkey } from 'components-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { LOADER_INTRO_FADE_MS, LOADER_LIFT_DURATION_MS } from '../game/constants';
	import {
		LOADER_CARD_2_SOCIAL_IMAGE_URL,
		LOADER_SCREEN_IMAGE_URLS,
		loaderScreenImageUrls,
	} from '../game/loaderCardAssets';
	import { clearHtmlPreloadMemoryRegistry } from '../game/preloadHtmlImages';

	type Props = {
		onloaded?: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	$effect(() => {
		if (context.stateApp.loaded) {
			gameEntrance.preloadContent = true;
		}
	});

	/** Drop loader-card Dev RAM rows once intro is gone (HTTP cache may still hold bytes). */
	const releaseLoaderHtmlPreloads = () => {
		clearHtmlPreloadMemoryRegistry([
			...LOADER_SCREEN_IMAGE_URLS,
			...loaderScreenImageUrls(),
			LOADER_CARD_2_SOCIAL_IMAGE_URL,
		]);
	};

	const onExitComplete = () => {
		gameEntrance.loaderExitActive = false;
		gameEntrance.introFading = false;
		gameEntrance.loadingCardsVisible = false;
		gameEntrance.liftComplete = true;
		context.stateLayout.showLoadingScreen = false;
		releaseLoaderHtmlPreloads();
		props.onloaded?.();
	};

	const startLoadingTransition = () => {
		if (gameEntrance.loaderExitActive || gameEntrance.introFading) return;

		// Keep cards + bonus spine painted through the lift; loader WebGL is
		// destroyed when the overlay unmounts (showLoadingScreen → false).
		gameEntrance.loadingCardsVisible = false;
		gameEntrance.loaderExitActive = true;
		gameEntrance.showContent = true;

		void waitForTimeout(LOADER_LIFT_DURATION_MS).then(() => {
			gameEntrance.introFading = true;
			void waitForTimeout(LOADER_INTRO_FADE_MS).then(onExitComplete);
		});
	};

	const canContinue = $derived(
		context.stateApp.loaded &&
			gameEntrance.bootstrapDismissed &&
			gameEntrance.loadingCardsVisible &&
			!gameEntrance.loaderExitActive,
	);
</script>

{#if canContinue}
	<OnHotkey hotkey="Space" onpress={startLoadingTransition} />
	<!-- HTML hit target — OnPressFullScreen is Pixi-only and does not work in intro panel. -->
	<button
		type="button"
		class="continue-hit"
		aria-label="Continue"
		onclick={startLoadingTransition}
	></button>
{/if}

<style lang="scss">
	.continue-hit {
		position: absolute;
		inset: 0;
		z-index: 50;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		background: transparent;
	}
</style>
