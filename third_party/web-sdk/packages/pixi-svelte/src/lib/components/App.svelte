<script lang="ts">
	import { onMount, onDestroy, type Snippet } from 'svelte';

	import { getContextApp } from '../context.svelte';

	import InitialiseApplication from './InitialiseApplication.svelte';
	import InitialiseParent from './InitialiseParent.svelte';
	import AssetsLoader from './AssetsLoader.svelte';

	type Props = {
		children: Snippet;
		// Forwarded to InitialiseApplication — caps renderer resolution (DPR).
		maxResolution?: number;
	};

	const props: Props = $props();
	const context = getContextApp();

	onMount(() => context.stateApp.reset());
	onDestroy(() => context.stateApp.reset());
</script>

<InitialiseApplication maxResolution={props.maxResolution}>
	<InitialiseParent>
		<AssetsLoader>
			{@render props.children()}
		</AssetsLoader>
	</InitialiseParent>
</InitialiseApplication>
