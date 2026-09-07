<script lang="ts">
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
			<BoardBase idleBounce />
		</Container>
	</BoardContainer>
{/if}
