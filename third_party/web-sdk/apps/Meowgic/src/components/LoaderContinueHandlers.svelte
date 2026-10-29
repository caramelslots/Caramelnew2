<script lang="ts">
	import { OnHotkey } from 'components-shared';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';

	const context = getContext();

	$effect(() => {
		if (context.stateApp.loaded) {
			gameEntrance.preloadContent = true;
		}
	});

	/** Press to continue — Game.svelte runs the board drop from this flag. */
	const requestEntranceTransition = () => {
		if (gameEntrance.loaderExitActive || gameEntrance.liftComplete) return;
		if (!context.stateApp.loaded || !gameEntrance.bootstrapDismissed) return;

		// Keep the cards mounted so the intro overlay can fade them out.
		// They unmount when the entrance finishes.
		gameEntrance.loaderExitActive = true;
	};

	const canContinue = $derived(
		context.stateApp.loaded &&
			gameEntrance.bootstrapDismissed &&
			gameEntrance.loadingCardsVisible &&
			!gameEntrance.loaderExitActive &&
			!gameEntrance.liftComplete,
	);
</script>

{#if canContinue}
	<OnHotkey hotkey="Space" onpress={requestEntranceTransition} />
	<button
		type="button"
		class="continue-hit"
		aria-label="Continue"
		onclick={requestEntranceTransition}
	></button>
{/if}

<style lang="scss">
	.continue-hit {
		position: absolute;
		inset: 0;
		z-index: 60;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		background: transparent;
		pointer-events: auto;
	}
</style>
