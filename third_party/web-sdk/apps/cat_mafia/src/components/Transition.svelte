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
			pendingGameType = event.gameType;
			stateGame.ladderVisible = false;

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
			oncomplete();
			transitioning = false;
			stateGame.transitionActive = false;
			pendingGameType = undefined;
		}}
	/>
{/if}
