<script lang="ts">
	import { OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';

	import PressToContinueHtml from './PressToContinueHtml.svelte';

	type Props = {
		onpress?: () => void;
		/** When false, only renders the label (no fullscreen / hotkey handlers). */
		interactive?: boolean;
	};

	const props: Props = $props();
	const interactive = $derived(props.interactive !== false);
</script>

<PressToContinueHtml />

{#if interactive}
	<OnHotkey hotkey="Space" onpress={() => props.onpress?.()} />
	<OnPressFullScreen onpress={() => props.onpress?.()} />
{/if}
