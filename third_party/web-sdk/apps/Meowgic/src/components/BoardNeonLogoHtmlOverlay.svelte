<!--
	MEOWFIA neon logo — HTML, left of the slot board (all layouts except phone).
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { computeBoardNeonLogoScreenBox } from '../game/boardNeonLogoLayout';
	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { LOADER_NEON_LOGO_URL } from '../game/loaderCardAssets';
	import { isFreeSpinsActive } from '../game/activeFeature';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { stateGame } from '../game/stateGame.svelte';
	import { hudWinDimStyle } from '../game/hudWinDim';

	const context = getContext();

	let uiVisible = $state(true);

	context.eventEmitter.subscribeOnMount({
		uiShow: () => {
			uiVisible = true;
		},
		uiHide: () => {
			uiVisible = false;
		},
	});

	// Warm cache while the board preloads under the intro panel.
	onMount(() => {
		const img = new Image();
		img.src = LOADER_NEON_LOGO_URL;
		void img.decode?.();
	});

	const box = $derived(
		computeBoardNeonLogoScreenBox({
			layoutDerived: context.stateLayoutDerived,
			board: context.stateGameDerived.boardLayout(),
		}),
	);

	const winDimStyle = $derived(hudWinDimStyle());
	const show = $derived(
		uiVisible &&
			box.show &&
			!stateDuel.active &&
			!isFreeSpinsActive() &&
			!stateGame.freeSpinIntroActive &&
			gameEntrance.preloadContent,
	);
</script>

{#if show}
	<div
		class="board-neon-logo"
		style:left="{box.left}px"
		style:top="{box.top}px"
		style:width="{box.width}px"
		style:height="{box.height}px"
		style={winDimStyle}
		aria-hidden="true"
	>
		<img class="board-neon-logo-img" src={LOADER_NEON_LOGO_URL} alt="" draggable="false" />
	</div>
{/if}

<style lang="scss">
	.board-neon-logo {
		/* Absolute inside .game-panel so the logo rides the entrance lift with the board.
		   Fixed would pin to the lift stack / viewport and only line up after settle. */
		position: absolute;
		z-index: 41;
		pointer-events: none;
		user-select: none;
	}

	.board-neon-logo-img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		pointer-events: none;
		user-select: none;
	}
</style>
