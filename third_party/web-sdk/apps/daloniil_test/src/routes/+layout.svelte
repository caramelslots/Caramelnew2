<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoadI18n } from 'components-shared';
	import BootstrapLoader from '../components/BootstrapLoader.svelte';
	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { startEarlyAssetPreload, startBatch2EarlyPreload, startBatch3EarlyPreload } from '../game/earlyAssetPreload';
	import { setLoaderStage } from '../game/loaderAssetPipeline.svelte';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

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

<BootstrapLoader oncomplete={() => setLoaderStage('cards')} />

{@render props.children()}
