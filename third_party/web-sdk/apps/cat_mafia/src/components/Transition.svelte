<script lang="ts" module>
	import type { GameType } from '../game/types';

	export type EmitterEventTransition = { type: 'transition'; gameType?: GameType };
</script>

<script lang="ts">
	import { waitForResolve } from 'utils-shared/wait';

	import TransitionAnimation from './TransitionAnimation.svelte';
	import { getContext } from '../game/context';
	import { stateGame } from '../game/stateGame.svelte';

	const context = getContext();

	let transitioning = $state(false);
	let oncomplete = $state(() => {});
	let pendingGameType = $state<GameType | undefined>(undefined);

	context.eventEmitter.subscribeOnMount({
		transition: async (event) => {
			transitioning = true;
			stateGame.transitionActive = true;
			stateGame.transitionGameType = event.gameType;
			pendingGameType = event.gameType;

			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

{#if transitioning}
	<TransitionAnimation
		onThemeSwitch={() => {
			if (pendingGameType) {
				stateGame.gameType = pendingGameType;
				// Mount drum only once steam has closed over the screen.
				if (pendingGameType === 'freegame') stateGame.fsDrumWanted = true;
				pendingGameType = undefined;
			}
			// Swap gallery → symbols while steam fully covers the board.
			if (stateGame.targetPickOpen) {
				context.eventEmitter.broadcast({ type: 'targetPickDismiss' });
			}
		}}
		oncomplete={() => {
			oncomplete();
			transitioning = false;
			stateGame.transitionActive = false;
			stateGame.transitionGameType = undefined;
			pendingGameType = undefined;
		}}
	/>
{/if}
