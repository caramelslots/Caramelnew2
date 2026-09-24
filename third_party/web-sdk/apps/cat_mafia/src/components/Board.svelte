<script lang="ts" module>
	import type { RawSymbol, Position, SymbolName } from '../game/types';
	import type { ReelSymbol } from '../game/stateGame.svelte';
	import { toRevealedRawSymbol } from '../game/utils';

	export type MysteryRevealItem = {
		symbolPositions: Position[];
		revealedSymbol: SymbolName;
	};

	export type EmitterEventBoard =
		| { type: 'boardSettle'; board: RawSymbol[][] }
		| { type: 'boardShow' }
		| { type: 'boardHide' }
		| {
				type: 'boardWithAnimateSymbols';
				symbolPositions: Position[];
		  }
		| {
				type: 'boardMysteryReveal';
				symbolPositions: Position[];
				revealedSymbol: SymbolName;
		  }
	| {
			type: 'boardMysteryRevealBatch';
			reveals: MysteryRevealItem[];
			syncAnimation: boolean;
	  }
	| {
			/** Collapse (reverse explosion) for mystery reels that revealed on the
			 *  previous spin. Fired fire-and-forget at the start of the next spin. */
			type: 'boardMysteryCollapseReels';
			reelIndices: number[];
	  };
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { stateBetDerived } from 'state-shared';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { MYSTERY_EXPLOSION_DURATION_S } from '../game/constants';
	import { freezeMysteryReel, trackMysteryCollapse } from '../game/mysteryReel';
	import { shouldHideBoardSwTile } from '../game/swCurtainGuard';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import BoardBase from './BoardBase.svelte';
	import CatAnticipationFrames from './CatAnticipationFrames.svelte';
	import CatAnticipationSound from './CatAnticipationSound.svelte';

	const context = getContext();

	let show = $state(true);

	type MysteryCell = { reelSymbol: ReelSymbol; revealedSymbol: SymbolName; reelIndex: number };

	const mysteryAnimationTimeoutMs = (durationS: number) =>
		Math.ceil((durationS * 1000 + 400) / stateBetDerived.timeScale());

	const waitForSymbolComplete = (reelSymbol: ReelSymbol, timeoutMs: number) =>
		Promise.race([
			waitForResolve((resolve) => {
				reelSymbol.oncomplete = resolve;
			}),
			waitForTimeout(timeoutMs),
		]);

	const runMysteryCollapseReels = async (reelIndices: number[]) => {
		const cells: { reelSymbol: ReelSymbol; reelIndex: number }[] = [];
		for (const reelIndex of reelIndices) {
			const reel = context.stateGame.board[reelIndex];
			for (let row = 0; row < reel.reelLength; row++) {
				cells.push({ reelSymbol: reel.reelState.symbols[row], reelIndex });
			}
		}

		for (const { reelSymbol } of cells) {
			reelSymbol.rawSymbol = { name: 'M' };
			reelSymbol.symbolState = 'mysteryCollapse';
		}

		const collapseTimeoutMs = mysteryAnimationTimeoutMs(MYSTERY_EXPLOSION_DURATION_S / 2);
		await Promise.all(
			cells.map(({ reelSymbol }) => waitForSymbolComplete(reelSymbol, collapseTimeoutMs)),
		);

		const frozenSet = new Set<number>();
		for (const { reelSymbol, reelIndex } of cells) {
			reelSymbol.symbolState = 'static';
			frozenSet.add(reelIndex);
		}
		for (const reelIndex of frozenSet) {
			freezeMysteryReel(reelIndex);
		}
	};

	const runMysteryRevealBatch = async ({
		reveals,
		syncAnimation,
	}: {
		reveals: MysteryRevealItem[];
		syncAnimation: boolean;
	}) => {
		const cells: MysteryCell[] = [];

		for (const { symbolPositions, revealedSymbol } of reveals) {
			for (const position of symbolPositions) {
				const reelSymbol =
					context.stateGame.board[position.reel].reelState.symbols[position.row];
				reelSymbol.rawSymbol = {
					name: 'M',
					mysteryRevealTo: revealedSymbol,
					mysteryRevealSync: syncAnimation,
				};
				reelSymbol.symbolState = 'mysteryReveal';
				cells.push({ reelSymbol, revealedSymbol, reelIndex: position.reel });
			}
		}

		const revealTimeoutMs = mysteryAnimationTimeoutMs(MYSTERY_EXPLOSION_DURATION_S);
		await Promise.all(
			cells.map(({ reelSymbol }) => waitForSymbolComplete(reelSymbol, revealTimeoutMs)),
		);

		const landTimeoutMs = mysteryAnimationTimeoutMs(0.35);
		await Promise.all(
			cells.map(async ({ reelSymbol, revealedSymbol }) => {
				reelSymbol.rawSymbol = toRevealedRawSymbol(revealedSymbol);
				reelSymbol.symbolState = 'land';
				await waitForSymbolComplete(reelSymbol, landTimeoutMs);
				reelSymbol.symbolState = 'static';
			}),
		);

		// Mystery symbol stays open (showing the revealed value) until the next
		// spin starts. The collapse back to ? is triggered concurrently with the
		// next reel scroll via the boardMysteryCollapseReels event.
	};

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => context.stateGameDerived.enhancedBoard.stop(),
		boardSettle: ({ board }) => context.stateGameDerived.enhancedBoard.settle(board),
		boardShow: () => (show = true),
		boardHide: () => (show = false),
		boardWithAnimateSymbols: async ({ symbolPositions }) => {
			const getPromises = () =>
				symbolPositions.map(async (position) => {
					const reelSymbol = context.stateGame.board[position.reel].reelState.symbols[position.row];
					// Expanded / sticky SW is Spine-curtain only — never run tile win FX
					// (and never await oncomplete from an unmounted Symbol).
					if (
						reelSymbol.rawSymbol.name === 'SW' &&
						shouldHideBoardSwTile(position.reel)
					) {
						reelSymbol.symbolState = 'postWinStatic';
						return;
					}
					// SW expand (and sticky paint) may leave cells in `win` / `postWinStatic`.
					// Re-assigning `win` without a state edge does not re-fire ReelSymbol's
					// $effect, so oncomplete never runs and the book pipeline hangs.
					if (
						reelSymbol.symbolState === 'win' ||
						reelSymbol.symbolState === 'postWinStatic' ||
						reelSymbol.symbolState === 'winLift'
					) {
						reelSymbol.symbolState = 'static';
						await tick();
					}
					// Lift above gold rails with idle art first — starting `win` while still
					// on the masked board makes the first half of H3/etc. play under the
					// dividers, then remount above for the rest.
					reelSymbol.symbolState = 'winLift';
					await tick();
					reelSymbol.symbolState = 'win';
					await waitForResolve((resolve) => (reelSymbol.oncomplete = resolve));
					reelSymbol.symbolState = 'postWinStatic';
				});

			await Promise.all(getPromises());
		},
		boardMysteryReveal: async ({ symbolPositions, revealedSymbol }) => {
			await runMysteryRevealBatch({
				reveals: [{ symbolPositions, revealedSymbol }],
				syncAnimation: false,
			});
		},
		boardMysteryRevealBatch: async ({ reveals, syncAnimation }) => {
			await runMysteryRevealBatch({ reveals, syncAnimation });
		},
		boardMysteryCollapseReels: ({ reelIndices }) => {
			trackMysteryCollapse(runMysteryCollapseReels(reelIndices));
		},
	});

	context.stateGameDerived.enhancedBoard.readyToSpinEffect();
</script>

{#if show}
	<BoardContainer>
		<!-- Feather mask applies to symbols only — outline spine uses its own clip mask. -->
		<Container>
			<BoardMask />
			<Container y={context.stateGameDerived.targetPickBoardY()}>
				<BoardBase />
			</Container>
		</Container>
		<!-- Mystery explosion uses screen-blend Aura slots — render outside the
		     board mask so VFX composite over parchment instead of a transparent RT. -->
		<BoardBase mysteryFx />
		<CatAnticipationFrames />
		<CatAnticipationSound />
	</BoardContainer>
{/if}
