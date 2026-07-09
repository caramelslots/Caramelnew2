<script lang="ts">
	import { FadeContainer } from 'components-pixi';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
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

	const onTransitionComplete = () => {
		gameEntrance.showContent = true;
		props.onloaded();
	};
</script>

<!-- press to continue -->
<FadeContainer show={loadingType === 'start' && context.stateApp.loaded}>
	<PressToContinue onpress={() => (loadingType = 'transition')} />
</FadeContainer>

<!-- transition between the loading screen and the game -->
<FadeContainer show={loadingType === 'transition'}>
	<TransitionAnimation oncomplete={onTransitionComplete} />
</FadeContainer>
