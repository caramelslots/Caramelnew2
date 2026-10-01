<script lang="ts">
	import { stateBet, stateUrlDerived } from 'state-shared';
	import { getContext } from '../game/context';
	import { onMount } from 'svelte';

	const context = getContext();

	onMount(() => {
		// Replay starts from ModalBetReplay ("Start Replay"), not on load.
		if (stateUrlDerived.replay()) return;
		if (!stateBet.betToResume) return;

		if (stateBet.betToResume.active && stateBet.betToResume.mode) {
			stateBet.activeBetModeKey = stateBet.betToResume.mode;
		}
		context.eventEmitter.broadcast({ type: 'resumeBet' });
	});
</script>
