<!--
	Toggles living spine idle for visible symbols (every mode / device).
	Desktop duel: both desks keep the global gate on while one side celebrates —
	per-desk freeze lives in SymbolSpineMain (other desk keeps breathing).
	Phone: no living idle for the whole duel. Two desks of idle spines during
	turbo spins, line holds, and triggers were hitching the ticker.
-->
<script lang="ts">
	import { onMount } from 'svelte';

	import { stateModal } from 'state-shared';

	import { getContext } from '../game/context';
	import { stateDuel } from '../game/stateDuel.svelte';
	import { stateGame, stateGameDerived } from '../game/stateGame.svelte';
	import { isPhoneForAtlasDownscale } from '../game/phoneSpineAtlasDownscale';

	const context = getContext();

	const canRunLivingIdle = () => {
		const phone = isPhoneForAtlasDownscale();
		if (
			stateGame.targetPickOpen ||
			stateGame.winSpotlightActive ||
			// Phone duel: idle spines on both desks hitch turbo land / lines / triggers.
			(phone && stateDuel.active) ||
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
