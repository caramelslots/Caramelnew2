<!--
	Single full-screen viewport: the WebGL slot (and its room) underneath,
	loader cards on top. Continue fades the cards; the room is not swapped.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';

	type Props = {
		intro: Snippet;
		game: Snippet;
	};

	const props: Props = $props();
	const context = getContext();

	const panelHeight = $derived.by(() => {
		const layout = context.stateLayoutDerived.canvasSizes();
		if (layout.height > 0) return layout.height;
		return typeof window !== 'undefined' ? window.innerHeight : 0;
	});

	/** Bootstrap + cards. Stay mounted through the fade so the room underneath is uninterrupted. */
	const showIntroOverlay = $derived(
		!gameEntrance.liftComplete && context.stateLayout.showLoadingScreen,
	);
</script>

<div class="entrance-viewport" class:entrance-viewport--settled={gameEntrance.liftComplete}>
	<section class="game-panel" style:--panel-h="{panelHeight}px">
		{@render props.game()}
	</section>
	{#if showIntroOverlay}
		<section class="intro-overlay" style:--panel-h="{panelHeight}px">
			{@render props.intro()}
		</section>
	{/if}
</div>

<style lang="scss">
	.entrance-viewport {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #000;
	}

	.game-panel {
		position: relative;
		width: 100%;
		height: var(--panel-h);
		overflow: hidden;
		background: #000;
		z-index: 0;
	}

	.entrance-viewport--settled .game-panel {
		overflow: visible;
	}

	.intro-overlay {
		position: absolute;
		inset: 0;
		z-index: 20;
		width: 100%;
		height: var(--panel-h);
		overflow: visible;
		pointer-events: none;
	}

</style>
