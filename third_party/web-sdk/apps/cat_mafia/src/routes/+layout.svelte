<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoadI18n } from 'components-shared';
	import BootstrapLoader from '../components/BootstrapLoader.svelte';
	import LoaderStreetStill from '../components/LoaderStreetStill.svelte';
	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { startEarlyAssetPreload, startBatch2EarlyPreload, startBatch3EarlyPreload } from '../game/earlyAssetPreload';
	import { setLoaderStage } from '../game/loaderAssetPipeline.svelte';
	import { devPreview } from '../game/devPreview.svelte';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	let showYourLoader = $state(true);

	setContext();

	onMount(() => {
		startEarlyAssetPreload();
		startBatch2EarlyPreload();
		startBatch3EarlyPreload();
	});
</script>

<GlobalStyle>
	<Authenticate>
		<LoadI18n {messagesMap}>
			<Game />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

<!-- Static street under logo/cards — same cover box as Pixi Background. -->
<LoaderStreetStill />

{#if showYourLoader}
	<BootstrapLoader
		oncomplete={() => setLoaderStage('cards')}
		ondismissed={() => {
			showYourLoader = false;
		}}
	/>
{/if}

{#if devPreview.loaderProgress && !showYourLoader}
	<BootstrapLoader preview />
{/if}

{@render props.children()}
