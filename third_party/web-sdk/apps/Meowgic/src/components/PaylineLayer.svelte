<script lang="ts">
	import { Container } from 'pixi-svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BoardBase from './BoardBase.svelte';
	import PaylineOverlay from './PaylineOverlay.svelte';
	import PaylineWinAmounts from './PaylineWinAmounts.svelte';
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
		<!-- Paint order + zIndex: lines → win/SW symbols → win amount (always on top). -->
		<PaylineOverlay />
		<Container zIndex={1}>
			<BoardBase abovePayline />
		</Container>
		<PaylineWinAmounts zIndex={50} />
	</BoardContainer>
{/if}
