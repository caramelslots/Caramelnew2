<script lang="ts">
	import { OnMount } from 'components-shared';

	import { getContext } from '../game/context';

	const context = getContext();

	const hasCatSlow = $derived(context.stateGame.catSlowReels.length > 0);
</script>

{#if hasCatSlow}
	<OnMount
		onmount={() => {
			context.eventEmitter.broadcast({
				type: 'soundOnce',
				name: 'sfx_cat_slow',
				forcePlay: true,
			});

			return () => {
				context.eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_cat_slow' });
			};
		}}
	/>
{/if}
