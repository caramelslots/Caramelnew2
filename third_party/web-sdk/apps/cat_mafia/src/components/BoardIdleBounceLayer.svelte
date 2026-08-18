<script lang="ts">
	import BoardContainer from './BoardContainer.svelte';
	import BoardBase from './BoardBase.svelte';
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
		<BoardBase idleBounce />
	</BoardContainer>
{/if}
