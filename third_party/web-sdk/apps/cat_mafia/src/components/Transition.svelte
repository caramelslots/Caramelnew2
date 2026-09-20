<script lang="ts" module>
	import type { GameType } from '../game/types';

	export type EmitterEventTransition =
		| {
				type: 'transition';
				gameType?: GameType;
				/**
				 * FS entry: steam starts, but night / white mascot / drum wait until
				 * the caller unloads tir GPU (`transitionApplyTheme`).
				 */
				deferThemeSwitch?: boolean;
		  }
		| { type: 'transitionApplyTheme' };
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
	let deferThemeSwitch = $state(false);
	let oncomplete = $state(() => {});
	let pendingGameType = $state<GameType | undefined>(undefined);
	let themeApplied = false;

	const applyThemeSwitch = () => {
		if (themeApplied) return;
		themeApplied = true;

		if (pendingGameType) {
			const next = pendingGameType;
			stateGame.transitionGameType = next;
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
	};

	context.eventEmitter.subscribeOnMount({
		transition: async (event) => {
			transitioning = true;
			themeApplied = false;
			deferThemeSwitch = Boolean(event.deferThemeSwitch);
			stateGame.transitionActive = true;
			pendingGameType = event.gameType;
			// Defer destination skin preload — white mascot + tir 4K is the FS-entry Jetsam.
			if (!deferThemeSwitch) {
				stateGame.transitionGameType = event.gameType;
			}

			await waitForResolve((resolve) => (oncomplete = resolve));
		},
		transitionApplyTheme: () => {
			applyThemeSwitch();
		},
	});
</script>

{#if transitioning}
	<TransitionAnimation
		timedThemeSwitch={!deferThemeSwitch}
		onThemeSwitch={applyThemeSwitch}
		oncomplete={() => {
			applyThemeSwitch();
			oncomplete();
			transitioning = false;
			deferThemeSwitch = false;
			stateGame.transitionActive = false;
			stateGame.transitionGameType = undefined;
			pendingGameType = undefined;
		}}
	/>
{/if}
