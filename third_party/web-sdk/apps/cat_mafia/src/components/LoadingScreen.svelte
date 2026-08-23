<script lang="ts">
	import { FadeContainer } from 'components-pixi';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { LOADER_STREET_SWAP_DELAY_MS } from '../game/constants';
	import { startLoadingIdleUiPreload } from '../game/uiHtmlAssetManifest';
	import TransitionAnimation from './TransitionAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';

	type Props = {
		onloaded: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	let loadingType = $state<'start' | 'transition'>('start');

	$effect(() => {
		gameEntrance.loadingCardsVisible = loadingType === 'start';
	});

	// Warm up board symbols / frame textures while the player reads "press to continue".
	$effect(() => {
		if (context.stateApp.loaded) {
			gameEntrance.preloadContent = true;
			startLoadingIdleUiPreload();
		}
	});

	const onThemeSwitch = () => {
		// Clouds are opaque — swap HTML still → Pixi under cover.
		gameEntrance.hideLoaderStreet = true;
	};

	const onTransitionComplete = () => {
		gameEntrance.loadingCloudActive = false;
		gameEntrance.showContent = true;
		props.onloaded();
	};

	const startLoadingTransition = () => {
		// Lift Pixi so steam draws over the HTML still; still drops at onThemeSwitch.
		gameEntrance.loadingCloudActive = true;
		loadingType = 'transition';
	};
</script>

<!-- press to continue -->
<FadeContainer show={loadingType === 'start' && context.stateApp.loaded}>
	<PressToContinue onpress={startLoadingTransition} />
</FadeContainer>

<!-- transition between the loading screen and the game -->
<FadeContainer show={loadingType === 'transition'}>
	<TransitionAnimation
		oncomplete={onTransitionComplete}
		onThemeSwitch={onThemeSwitch}
		themeSwitchDelayMs={LOADER_STREET_SWAP_DELAY_MS}
	/>
</FadeContainer>
