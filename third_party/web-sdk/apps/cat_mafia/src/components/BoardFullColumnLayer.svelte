<script lang="ts">
	/**
	 * Resting Bonus / Wild / Super Wild above the gold rails.
	 * Spinning tiles stay on the masked board; once stopped they lift so the
	 * outer desk frame cannot clip columns 1 and 5.
	 *
	 * Do NOT add BoardMask here — extra Sprite masks corrupt the main reel mask.
	 * During target-pick slide, BoardBase keeps these on the masked board instead.
	 */
	import { Container } from 'pixi-svelte';

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
		<Container y={context.stateGameDerived.targetPickBoardY()}>
			<BoardBase fullColumn />
		</Container>
	</BoardContainer>
{/if}
