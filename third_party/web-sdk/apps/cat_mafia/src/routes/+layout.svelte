<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoadI18n } from 'components-shared';
	import BootstrapLoader from '../components/BootstrapLoader.svelte';
	import EntranceLiftShell from '../components/EntranceLiftShell.svelte';
	import LoaderIntroBackground from '../components/LoaderIntroBackground.svelte';
	import LoaderCardsHtmlOverlay from '../components/LoaderCardsHtmlOverlay.svelte';
	import LoaderContinueHandlers from '../components/LoaderContinueHandlers.svelte';
	import { setContext } from '../game/context';
	import { startEarlyAssetPreload } from '../game/earlyAssetPreload';
	import { setLoaderStage } from '../game/loaderAssetPipeline.svelte';
	import { devPreview } from '../game/devPreview.svelte';
	import { gameEntrance } from '../game/gameEntrance.svelte';

	import messagesMap from '../i18n/messagesMap';

	const gameImport = import('../components/Game.svelte');

	type Props = { children: Snippet };

	const props: Props = $props();

	let showYourLoader = $state(true);

	setContext();

	onMount(() => {
		startEarlyAssetPreload();
		const blockZoom = (event: Event) => event.preventDefault();
		const blockPinchMove = (event: TouchEvent) => {
			if (event.touches.length > 1) event.preventDefault();
		};
		document.addEventListener('gesturestart', blockZoom, { passive: false });
		document.addEventListener('gesturechange', blockZoom, { passive: false });
		document.addEventListener('gestureend', blockZoom, { passive: false });
		document.addEventListener('touchmove', blockPinchMove, { passive: false });
		return () => {
			document.removeEventListener('gesturestart', blockZoom);
			document.removeEventListener('gesturechange', blockZoom);
			document.removeEventListener('gestureend', blockZoom);
			document.removeEventListener('touchmove', blockPinchMove);
		};
	});
</script>

<svelte:head>
	<meta
		name="viewport"
		content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
	/>
</svelte:head>

<GlobalStyle>
	<Authenticate>
		<LoadI18n {messagesMap}>
			<EntranceLiftShell>
				{#snippet intro()}
					<LoaderIntroBackground />

					{#if showYourLoader}
						<BootstrapLoader
							oncomplete={() => setLoaderStage('cards')}
							ondismissed={() => {
								showYourLoader = false;
								gameEntrance.bootstrapDismissed = true;
							}}
						/>
					{/if}

					<LoaderCardsHtmlOverlay />
					<LoaderContinueHandlers />
				{/snippet}

				{#snippet game()}
					{#await gameImport then { default: Game }}
						<Game />
					{/await}
				{/snippet}
			</EntranceLiftShell>
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

{#if devPreview.loaderProgress && !showYourLoader}
	<BootstrapLoader preview />
{/if}

{@render props.children()}

<style>
	:global(html),
	:global(body) {
		touch-action: pan-x pan-y;
		overscroll-behavior: none;
	}
</style>
