<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoaderStakeEngine, LoadI18n } from 'components-shared';
	import BootstrapLoader from '../components/BootstrapLoader.svelte';
	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { startEarlyAssetPreload, startBatch2EarlyPreload, startBatch3EarlyPreload } from '../game/earlyAssetPreload';
	import { setLoaderStage } from '../game/loaderAssetPipeline.svelte';
	import { devPreview } from '../game/devPreview.svelte';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	let showYourLoader = $state(false);

	const loaderUrlStakeEngine = new URL('../../stake-engine-loader.gif', import.meta.url).href;

	setContext();

	onMount(() => {
		startEarlyAssetPreload();
	});
</script>

<GlobalStyle>
	<Authenticate>
		<LoadI18n {messagesMap}>
			<Game />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

<LoaderStakeEngine
	src={loaderUrlStakeEngine}
	oncomplete={() => {
		showYourLoader = true;
		setLoaderStage('bootstrap');
		startBatch2EarlyPreload();
		startBatch3EarlyPreload();
	}}
/>

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