<script lang="ts">
	import { onMount } from 'svelte';

	import { stateModal } from 'state-shared';

	import { getContext } from '../game/context';
	import { LIVING_IDLE_TURN_MS } from '../game/constants';
	import { collectLivingIdleTypesOnBoard, nextLivingIdleSymbol } from '../game/boardLivingIdle';
	import { stateGame, stateGameDerived } from '../game/stateGame.svelte';

	const context = getContext();

	const canRunLivingIdle = () =>
		context.stateXstateDerived.isIdle() &&
		!stateGameDerived.boardReelsActive() &&
		!stateGameDerived.boardMysteryAnimating() &&
		!stateGame.winSpotlightActive &&
		!stateGame.winOverlayActive &&
		!stateGame.transitionActive &&
		!stateGame.freeSpinIntroActive &&
		stateModal.modal == null;

	const sleep = (ms: number, cancelled: () => boolean) =>
		new Promise<void>((resolve) => {
			const started = performance.now();
			const tick = () => {
				if (cancelled()) {
					resolve();
					return;
				}
				if (performance.now() - started >= ms) {
					resolve();
					return;
				}
				requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		});

	onMount(() => {
		let cancelled = false;

		const run = async () => {
			while (!cancelled) {
				while (!cancelled && !canRunLivingIdle()) {
					stateGame.livingIdleSymbol = null;
					await sleep(200, () => cancelled);
				}
				if (cancelled) break;

				const types = collectLivingIdleTypesOnBoard();
				stateGame.livingIdleSymbol = nextLivingIdleSymbol(types, stateGame.livingIdleSymbol);
				if (stateGame.livingIdleSymbol == null) {
					await sleep(500, () => cancelled);
					continue;
				}

				await sleep(LIVING_IDLE_TURN_MS, () => cancelled || !canRunLivingIdle());
			}
		};

		void run();

		return () => {
			cancelled = true;
			stateGame.livingIdleSymbol = null;
		};
	});
</script>
