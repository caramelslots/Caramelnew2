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
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { freezeMysteryReel } from '../game/mysteryReel';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import BoardBase from './BoardBase.svelte';
	import PaylineOverlay from './PaylineOverlay.svelte';
	import PaylineWinAmounts from './PaylineWinAmounts.svelte';

	const context = getContext();

	let show = $state(true);

	type MysteryCell = { reelSymbol: ReelSymbol; revealedSymbol: SymbolName; reelIndex: number };

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

		// Phase 1: wait for the explosion animation to complete on all cells.
		await Promise.all(
			cells.map(
				({ reelSymbol }) =>
					new Promise<void>((resolve) => {
						reelSymbol.oncomplete = resolve;
					}),
			),
		);

		// Phase 2: show the revealed symbol (land → static).
		await Promise.all(
			cells.map(async ({ reelSymbol, revealedSymbol }) => {
				reelSymbol.rawSymbol = toRevealedRawSymbol(revealedSymbol);
				reelSymbol.symbolState = 'land';
				await waitForResolve((resolve) => (reelSymbol.oncomplete = resolve));
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
		boardMysteryCollapseReels: async ({ reelIndices }) => {
			// Collect all visible cells for each pending-collapse reel.
			const cells: { reelSymbol: ReelSymbol; reelIndex: number }[] = [];
			for (const reelIndex of reelIndices) {
				const reel = context.stateGame.board[reelIndex];
				for (let row = 0; row < reel.reelLength; row++) {
					cells.push({ reelSymbol: reel.reelState.symbols[row], reelIndex });
				}
			}

			// Transition cells to the reverse-explosion (collapse) animation.
			// animationEnd on the descriptor limits playback to the closing half only.
			for (const { reelSymbol } of cells) {
				reelSymbol.rawSymbol = { name: 'M' };
				reelSymbol.symbolState = 'mysteryCollapse';
			}

			// Wait for the half-duration reverse animation to complete on every cell.
			await Promise.all(
				cells.map(
					({ reelSymbol }) =>
						new Promise<void>((resolve) => {
							reelSymbol.oncomplete = resolve;
						}),
				),
			);

			// Snap to static Mystery/? and permanently freeze the reel.
			const frozenSet = new Set<number>();
			for (const { reelSymbol, reelIndex } of cells) {
				reelSymbol.symbolState = 'static';
				frozenSet.add(reelIndex);
			}
			for (const reelIndex of frozenSet) {
				freezeMysteryReel(reelIndex);
			}
		},
	});

	context.stateGameDerived.enhancedBoard.readyToSpinEffect();
</script>

{#if show}
	<BoardContainer>
		<BoardMask />
		<BoardBase />
		<PaylineOverlay />
		<PaylineWinAmounts />
	</BoardContainer>
{/if}
