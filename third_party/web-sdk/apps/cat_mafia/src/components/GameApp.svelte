<script lang="ts">
	import { onMount, onDestroy, type Snippet } from 'svelte';

	import { getContextApp } from 'pixi-svelte';
	import InitialiseApplication from '../../../../packages/pixi-svelte/src/lib/components/InitialiseApplication.svelte';
	import InitialiseParent from '../../../../packages/pixi-svelte/src/lib/components/InitialiseParent.svelte';

	import GameAssetsLoader from './GameAssetsLoader.svelte';

	type Props = {
		children: Snippet;
		maxResolution?: number;
		antialias?: boolean;
		tuneForMobilePortrait?: boolean;
		webglOnIosAndroid?: boolean;
		preference?: 'webgl' | 'webgpu';
	};

	const props: Props = $props();
	const context = getContextApp();

	onMount(() => context.stateApp.reset());
	onDestroy(() => context.stateApp.reset());
</script>

<InitialiseApplication
	maxResolution={props.maxResolution}
	antialias={props.antialias}
	tuneForMobilePortrait={props.tuneForMobilePortrait}
	webglOnIosAndroid={props.webglOnIosAndroid}
	preference={props.preference}
>
	<InitialiseParent>
		<GameAssetsLoader>
			{@render props.children()}
		</GameAssetsLoader>
	</InitialiseParent>
</InitialiseApplication>
