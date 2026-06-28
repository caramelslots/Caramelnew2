<script lang="ts">
	import { onMount } from 'svelte';

	import { stateModal } from 'state-shared';

	import { getContext } from '../game/context';
	import {
		IDLE_BOUNCE_CYCLE_DELAY_MS,
		IDLE_BOUNCE_INITIAL_DELAY_MS,
	} from '../game/constants';
	import {
		bounceIdleSymbolGroup,
		collectIdleBounceGroups,
		pickIdleBounceGroup,
		resetIdleBounceSymbols,
	} from '../game/boardIdleBounce';
	import { stateGame, stateGameDerived } from '../game/stateGame.svelte';
	import type { SymbolName } from '../game/types';

	const context = getContext();

	const canRunIdleBounce = () =>
		context.stateXstateDerived.isIdle() &&
		stateGame.idleBounceAllowed &&
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
		let lastSymbol: SymbolName | null = null;
		let awaitingFirstDelay = true;

		const run = async () => {
			while (!cancelled) {
				while (!cancelled && !canRunIdleBounce()) {
					awaitingFirstDelay = true;
					lastSymbol = null;
					await sleep(200, () => cancelled);
				}
				if (cancelled) break;

				const delay = awaitingFirstDelay
					? IDLE_BOUNCE_INITIAL_DELAY_MS
					: IDLE_BOUNCE_CYCLE_DELAY_MS;
				await sleep(delay, () => cancelled);
				if (cancelled || !canRunIdleBounce()) continue;

				const groups = collectIdleBounceGroups();
				const picked = pickIdleBounceGroup(groups, lastSymbol);
				if (!picked) {
					await sleep(1000, () => cancelled);
					continue;
				}

				const [symbolName, cells] = picked;
				lastSymbol = symbolName;
				awaitingFirstDelay = false;
				await bounceIdleSymbolGroup(cells);
			}
		};

		void run();

		return () => {
			cancelled = true;
			resetIdleBounceSymbols();
		};
	});
</script>
