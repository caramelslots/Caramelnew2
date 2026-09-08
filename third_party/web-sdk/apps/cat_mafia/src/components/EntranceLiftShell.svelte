<!--
	Vertical entrance stack: intro panel (loader) above game panel (slot).
	On continue the stack lifts up so the slot scrolls into view.
-->
<script lang="ts">
	import { cubicInOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import type { Snippet } from 'svelte';

	import { getContext } from '../game/context';
	import { gameEntrance } from '../game/gameEntrance.svelte';
	import { LOADER_LIFT_DURATION_MS, LOADER_LIFT_SEAM_OVERLAP_PX } from '../game/constants';

	type Props = {
		intro: Snippet;
		game: Snippet;
	};

	const props: Props = $props();
	const context = getContext();

	const liftY = new Tween(0);

	const panelHeight = $derived.by(() => {
		const layout = context.stateLayoutDerived.canvasSizes();
		if (layout.height > 0) return layout.height;
		return typeof window !== 'undefined' ? window.innerHeight : 0;
	});

	const liftYpx = $derived(Math.round(liftY.current));

	const showIntroPanel = $derived(
		!gameEntrance.liftComplete &&
			(context.stateLayout.showLoadingScreen ||
				gameEntrance.loaderExitActive ||
				gameEntrance.introFading),
	);

	$effect(() => {
		if (gameEntrance.liftComplete) {
			void liftY.set(0, { duration: 0 });
			return;
		}

		if (gameEntrance.loaderExitActive || gameEntrance.introFading) {
			void liftY.set(-(panelHeight - LOADER_LIFT_SEAM_OVERLAP_PX), {
				duration: gameEntrance.introFading ? 0 : LOADER_LIFT_DURATION_MS,
				easing: cubicInOut,
			});
			return;
		}

		if (showIntroPanel) {
			void liftY.set(0, { duration: 0 });
		}
	});
</script>

<div class="entrance-viewport" class:entrance-viewport--settled={gameEntrance.liftComplete}>
	<div
		class="entrance-lift"
		style:transform="translate3d(0, {liftYpx}px, 0)"
		style:--panel-h="{panelHeight}px"
		style:--seam-overlap="{LOADER_LIFT_SEAM_OVERLAP_PX}px"
	>
		{#if showIntroPanel}
			<section class="intro-panel">
				{@render props.intro()}
			</section>
		{/if}
		<section class="game-panel">
			{@render props.game()}
		</section>
	</div>
</div>

<style lang="scss">
	.entrance-viewport {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #000;
	}

	.entrance-viewport--settled {
		position: fixed;
		background: #000;
	}

	.entrance-viewport--settled .game-panel {
		margin-top: 0;
	}

	.entrance-lift {
		will-change: transform;
		backface-visibility: hidden;
	}

	.intro-panel,
	.game-panel {
		position: relative;
		width: 100%;
		height: var(--panel-h);
		overflow: hidden;
	}

	.intro-panel {
		z-index: 1;
		/* Let roofs blur hang into the game panel. */
		overflow: visible;
	}

	.game-panel {
		/* Pull up over intro bottom — kills the seam between HTML + Pixi plates. */
		margin-top: calc(-1 * var(--seam-overlap));
		background: #000;
		z-index: 0;
	}
</style>
