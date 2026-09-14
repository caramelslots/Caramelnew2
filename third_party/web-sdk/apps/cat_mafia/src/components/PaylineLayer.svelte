<script lang="ts">
	import BoardContainer from './BoardContainer.svelte';
	import PaylineOverlay from './PaylineOverlay.svelte';
	import PaylineWinAmounts from './PaylineWinAmounts.svelte';
	import { getContext } from '../game/context';

	const context = getContext();
	let show = $state(true);

	context.eventEmitter.subscribeOnMount({
		boardShow: () => (show = true),
		boardHide: () => (show = false),
	});
</script>

{#if show}
	<BoardContainer>
		<PaylineOverlay />
		<PaylineWinAmounts />
	</BoardContainer>
{/if}
