<script lang="ts">
	/**
	 * Landed PB/PS/PG above the gold rails.
	 * Spinning paws stay on the masked board so they clip at the playfield edge.
	 */
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
		<BoardBase pawCoin />
	</BoardContainer>
{/if}
