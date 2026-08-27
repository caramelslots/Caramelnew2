<!--
	Toggles living spine idle for visible symbols (every mode / device).
	Desktop duel: both desks keep the global gate on while one side celebrates —
	per-desk freeze lives in SymbolSpineMain (other desk keeps breathing).
	Phone: freeze living idle on BOTH desks for the whole win spotlight hold
	(perf — two boards of spine idle during lines is too heavy).
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { stateModal } from 'state-shared';

	import { getContext } from '../game/context';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { stateGame, stateGameDerived } from '../game/stateGame.svelte';
	import { isPhoneCanvasSizeType } from '../game/streetOffscreenCull';

	const context = getContext();

	const canRunLivingIdle = () => {
		const phone = isPhoneCanvasSizeType(context.stateLayoutDerived.canvasSizeType());
		if (
			stateGame.winSpotlightActive ||
			// Phone duel: any desk celebrating → freeze idle everywhere.
			(phone && stateDuel.winSpotlightSide != null) ||
			stateGame.winOverlayActive ||
			stateGame.transitionActive ||
			stateGame.freeSpinIntroActive ||
			stateGame.duelIntroActive ||
			stateModal.modal != null
		) {
			return false;
		}
		// Duel (desktop): keep living idle on both desks even while one side
		// spins / holds spotlight — SymbolSpineMain freezes only that desk.
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
