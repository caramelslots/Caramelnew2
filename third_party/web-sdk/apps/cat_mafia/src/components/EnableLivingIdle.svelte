<!--
	Toggles living spine idle for visible symbols (every mode / device).
	In Duel, both desks keep the global gate on while one side spins or
	celebrates — per-desk freeze during that desk's win spotlight lives in
	SymbolSpineMain (so the other desk keeps breathing).
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
		// or holds a win spotlight (spinning / win cells aren't on idle anyway).
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
