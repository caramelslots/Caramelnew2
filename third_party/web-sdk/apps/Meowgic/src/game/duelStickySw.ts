import { BOARD_DIMENSIONS } from './constants';
import { getDuelBoardStack, type DuelSideBoardStack } from './stateDuelBoards.svelte';
import type { DuelSide } from './stateDuel.svelte';

export type DuelStickySwState = Record<number, number>;

export const emptyDuelStickySw = (): DuelStickySwState => ({});

export const expandDuelSuperWildColumn = (
	stack: DuelSideBoardStack,
	reelIndex: number,
	mult: number,
) => {
	const reel = stack.board[reelIndex];
	if (!reel) return;
	for (let paddedRow = 1; paddedRow <= BOARD_DIMENSIONS.y; paddedRow++) {
		const cell = reel.reelState.symbols[paddedRow];
		if (!cell) continue;
		cell.rawSymbol = { name: 'SW', wild: true, multiplier: mult };
		cell.symbolState = 'static';
	}
};

const fullSwMultFromRevealColumn = (column: { name: string; multiplier?: number }[]) => {
	let swRows = 0;
	let mult = 2;
	for (let paddedRow = 1; paddedRow <= BOARD_DIMENSIONS.y; paddedRow++) {
		const cell = column[paddedRow];
		if (cell?.name === 'SW') {
			swRows += 1;
			mult = cell.multiplier || mult;
		}
	}
	return swRows >= BOARD_DIMENSIONS.y ? mult : null;
};

/** Padded reel column with full SW on visible rows — same lock as bonus_normal FS. */
const fullStickySwPaddedColumn = (
	paddedColumn: { name: string; multiplier?: number }[],
	mult: number,
) =>
	paddedColumn.map((cell, row) =>
		row >= 1 && row <= BOARD_DIMENSIONS.y
			? { name: 'SW' as const, wild: true as const, multiplier: mult }
			: { ...cell },
	);

/** Sync duel Pixi pool from on-screen symbols before spin (like base `reveal` settle). */
export const settleDuelBoardFromPixi = (side: DuelSide) => {
	const stack = getDuelBoardStack(side);
	const settledBoard = stack.board.map((reel) =>
		reel.reelState.symbols
			.slice(0, reel.reelLength)
			.map(({ rawSymbol }) => ({ ...rawSymbol })),
	);
	stack.enhancedBoard.settle(settledBoard);
};

/** Paint sticky columns and return frozen reel indices for duel spin. */
export const prepareDuelStickySwFrozenReels = (
	side: DuelSide,
	stickySwByReel: DuelStickySwState,
	revealBoard: { name: string; multiplier?: number }[][],
) => {
	const stack = getDuelBoardStack(side);
	const sticky = stickySwByReel;

	for (let reelIndex = 0; reelIndex < revealBoard.length; reelIndex++) {
		const fromState = sticky[reelIndex];
		const fromReveal = fullSwMultFromRevealColumn(revealBoard[reelIndex] || []);
		const mult = fromState ?? fromReveal;
		if (mult == null) continue;
		sticky[reelIndex] = mult;

		const reel = stack.board[reelIndex] as {
			stopPreSpin?: () => void;
			setSymbolsWithRawSymbols?: (
				symbols: { name: string; wild?: boolean; multiplier?: number }[],
			) => void;
		};
		reel?.stopPreSpin?.();
		expandDuelSuperWildColumn(stack, reelIndex, mult);
		const stickyColumn = fullStickySwPaddedColumn(revealBoard[reelIndex] || [], mult);
		if (stickyColumn.length && reel?.setSymbolsWithRawSymbols) {
			reel.setSymbolsWithRawSymbols(stickyColumn);
		}
	}

	return Object.keys(sticky).map(Number);
};

export const applyDuelStickySwPreExpanded = async (
	side: DuelSide,
	stickySwByReel: DuelStickySwState,
	wait: (ms: number) => Promise<void>,
) => {
	const stickyReels = Object.keys(stickySwByReel).map(Number);
	if (!stickyReels.length) return;
	const stack = getDuelBoardStack(side);
	for (const reel of stickyReels) {
		expandDuelSuperWildColumn(stack, reel, stickySwByReel[reel] || 2);
	}
	await wait(120);
};
