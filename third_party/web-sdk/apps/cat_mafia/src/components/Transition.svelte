<script lang="ts" module>
	import type { GameType } from '../game/types';

	export type EmitterEventTransition = { type: 'transition'; gameType?: GameType };
</script>

<script lang="ts">
	import { waitForResolve } from 'utils-shared/wait';
	import { stateUi } from 'state-shared';

	import TransitionAnimation from './TransitionAnimation.svelte';
	import { getContext } from '../game/context';
	import { wantedMascotCatSpineKey } from '../game/mascotCatSkinMemory';
	import { stateDuel } from '../game/stateDuel.svelte';
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
				const next = pendingGameType;
				stateGame.gameType = next;
				// Same beat as street/drum — mascot atlas while steam covers the board.
				stateGame.mascotCatSpineKey = wantedMascotCatSpineKey({
					gameType: next,
					duelActive: stateDuel.active,
				});
				if (next === 'freegame') {
					stateGame.fsDrumWanted = true;
					context.eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
					stateUi.freeSpinCounterShow = true;
					context.eventEmitter.broadcast({ type: 'drawerButtonShow' });
					context.eventEmitter.broadcast({ type: 'drawerFold' });
				} else if (next === 'basegame') {
					context.eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
					stateUi.freeSpinCounterShow = false;
					context.eventEmitter.broadcast({ type: 'drawerUnfold' });
					context.eventEmitter.broadcast({ type: 'drawerButtonHide' });
				}
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
