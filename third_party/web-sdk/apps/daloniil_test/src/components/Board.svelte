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
		  };
</script>

<script lang="ts">
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

	import { MYSTERY_REVEAL_POST_DELAY_MS } from '../game/constants';
	import { BoardContext } from 'components-shared';

	import { getContext } from '../game/context';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import BoardBase from './BoardBase.svelte';
	import PaylineOverlay from './PaylineOverlay.svelte';

	const context = getContext();

	let show = $state(true);

	type MysteryCell = { reelSymbol: ReelSymbol; revealedSymbol: SymbolName };

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
				cells.push({ reelSymbol, revealedSymbol });
			}
		}

		await Promise.all(
			cells.map(
				({ reelSymbol }) =>
					new Promise<void>((resolve) => {
						reelSymbol.oncomplete = resolve;
					}),
			),
		);

		await Promise.all(
			cells.map(async ({ reelSymbol, revealedSymbol }) => {
				reelSymbol.rawSymbol = toRevealedRawSymbol(revealedSymbol);
				reelSymbol.symbolState = 'land';
				await waitForResolve((resolve) => (reelSymbol.oncomplete = resolve));
				reelSymbol.symbolState = 'static';
			}),
		);

		await waitForTimeout(MYSTERY_REVEAL_POST_DELAY_MS);
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
	});

	context.stateGameDerived.enhancedBoard.readyToSpinEffect();
</script>

{#if show}
	<BoardContext animate={false}>
		<BoardContainer>
			<BoardMask />
			<BoardBase />
		</BoardContainer>
	</BoardContext>

	<BoardContext animate={true}>
		<BoardContainer>
			<BoardBase />
			<PaylineOverlay />
		</BoardContainer>
	</BoardContext>
{/if}
