<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoadI18n } from 'components-shared';
	import BootstrapLoader from '../components/BootstrapLoader.svelte';
	import EntranceLiftShell from '../components/EntranceLiftShell.svelte';
	import LoaderIntroBackground from '../components/LoaderIntroBackground.svelte';
	import LoaderCardsHtmlOverlay from '../components/LoaderCardsHtmlOverlay.svelte';
	import LoaderContinueHandlers from '../components/LoaderContinueHandlers.svelte';
	import GameNameHtmlOverlay from '../components/GameNameHtmlOverlay.svelte';
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
	});
</script>

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
			<GameNameHtmlOverlay />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

{#if devPreview.loaderProgress && !showYourLoader}
	<BootstrapLoader preview />
{/if}

{@render props.children()}
