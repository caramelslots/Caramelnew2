<script lang="ts" module>
	import type { GameType } from '../game/types';

	export type EmitterEventTransition = { type: 'transition'; gameType?: GameType };
</script>

<script lang="ts">
	import { waitForResolve } from 'utils-shared/wait';

	import TransitionAnimation from './TransitionAnimation.svelte';
	import { getContext } from '../game/context';
	import { TRANSITION_LADDER_SHOW_DELAY_MS } from '../game/constants';
	import { stateGame } from '../game/stateGame.svelte';

	const context = getContext();

	let transitioning = $state(false);
	let oncomplete = $state(() => {});
	let pendingGameType = $state<GameType | undefined>(undefined);
	let ladderTimer: ReturnType<typeof setTimeout> | null = null;

	const clearLadderTimer = () => {
		if (ladderTimer !== null) {
			clearTimeout(ladderTimer);
			ladderTimer = null;
		}
	};

	context.eventEmitter.subscribeOnMount({
		transition: async (event) => {
			transitioning = true;
			stateGame.transitionActive = true;
			pendingGameType = event.gameType;

			clearLadderTimer();
			if (event.gameType === 'freegame') {
				stateGame.ladderVisible = false;
				ladderTimer = setTimeout(() => {
					ladderTimer = null;
					stateGame.ladderVisible = true;
				}, TRANSITION_LADDER_SHOW_DELAY_MS);
			} else {
				stateGame.ladderVisible = false;
			}

			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

{#if transitioning}
	<TransitionAnimation
		onThemeSwitch={() => {
			if (pendingGameType) {
				stateGame.gameType = pendingGameType;
				pendingGameType = undefined;
			}
		}}
		oncomplete={() => {
			clearLadderTimer();
			oncomplete();
			transitioning = false;
			stateGame.transitionActive = false;
			pendingGameType = undefined;
		}}
	/>
{/if}
