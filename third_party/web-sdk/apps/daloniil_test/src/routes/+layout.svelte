<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoaderStakeEngine, LoadI18n } from 'components-shared';
	import BootstrapLoader from '../components/BootstrapLoader.svelte';
	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import { startEarlyLoaderBackgroundPreload } from '../game/earlyLoaderPreload';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	let showYourLoader = $state(false);

	const loaderUrlStakeEngine = new URL('../../stake-engine-loader.gif', import.meta.url).href;

	setContext();

	onMount(() => {
		startEarlyLoaderBackgroundPreload();
	});
</script>

<GlobalStyle>
	<Authenticate>
		<LoadI18n {messagesMap}>
			<Game />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

<LoaderStakeEngine src={loaderUrlStakeEngine} oncomplete={() => (showYourLoader = true)} />

{#if showYourLoader}
	<BootstrapLoader />
{/if}

{@render props.children()}