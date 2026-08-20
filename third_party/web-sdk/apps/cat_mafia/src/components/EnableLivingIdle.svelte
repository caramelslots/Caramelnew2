<!--
	Toggles living spine idle for all visible symbols at once (every mode / device).
	In Duel, both desks animate whenever their reels are stopped (book play is not xstate idle).
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { stateModal } from 'state-shared';

	import { getContext } from '../game/context';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { stateGame, stateGameDerived } from '../game/stateGame.svelte';

	const context = getContext();

	const canRunLivingIdle = () => {
		if (
			stateGame.winSpotlightActive ||
			stateGame.winOverlayActive ||
			stateGame.transitionActive ||
			stateGame.freeSpinIntroActive ||
			stateGame.duelIntroActive ||
			stateModal.modal != null
		) {
			return false;
		}
		// Duel: keep living idle on both desks even while one side spins
		// (spinning cells aren't on the idle clip anyway). Perf test for phone.
		if (stateDuel.active) {
			return true;
		}
		return (
			context.stateXstateDerived.isIdle() &&
			!stateGameDerived.boardReelsActive() &&
			!stateGameDerived.boardMysteryAnimating()
		);
	};

	onMount(() => {
		let cancelled = false;
		let raf = 0;

		const tick = () => {
			if (cancelled) return;
			stateGame.livingIdleActive = canRunLivingIdle();
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);

		return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
			stateGame.livingIdleActive = false;
		};
	});
</script>
