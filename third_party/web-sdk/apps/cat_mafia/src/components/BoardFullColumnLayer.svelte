<script lang="ts">
	/**
	 * Resting symbols above the gold rails / desk frame.
	 * Spinning tiles stay on the masked board; once stopped they lift so the
	 * outer frame cannot clip lids, glow, or full-column props.
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
