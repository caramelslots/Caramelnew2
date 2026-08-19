/**
 * Dual Pixi reel boards for Duel — same createReelForSpinning / enhanceBoard
 * pipeline as the main base board, one stack per side.
 */
import _ from 'lodash';
import { stateBet } from 'state-shared';
import { createEnhanceBoard, createReelForSpinning } from 'utils-slots';

import {
	BOARD_DIMENSIONS,
	INITIAL_BOARD,
	INITIAL_SYMBOL_STATE,
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	SYMBOL_SIZE,
	isVisibleBoardSymbolIndex,
} from './constants';
import { eventEmitter } from './eventEmitter';
import { gameSpeedMultFor } from './gameSpeed';
import { stateGame } from './stateGame.svelte';
import type { DuelSide } from './stateDuel.svelte';
import type { RawSymbol } from './types';

const withReelScrollSpeedMult = <T extends typeof SPIN_OPTIONS_DEFAULT>(
	options: T,
	mult: number,
): T => {
	if (mult === 1) return options;
	return {
		...options,
		reelBounceBackSpeed: options.reelBounceBackSpeed * mult,
		reelSpinSpeedBeforeBounce: options.reelSpinSpeedBeforeBounce * mult,
		reelPreSpinSpeed: options.reelPreSpinSpeed * mult,
		reelSpinSpeed: options.reelSpinSpeed * mult,
		reelSpinDelay: Math.max(0, Math.round(options.reelSpinDelay / mult)),
		reelLandSquashRecoveryMs: Math.max(0, Math.round(options.reelLandSquashRecoveryMs / mult)),
	};
};

const onSymbolLand = ({
	rawSymbol,
	symbolIndex = 0,
	activeSymbolCount = BOARD_DIMENSIONS.y,
}: {
	rawSymbol: RawSymbol;
	symbolIndex?: number;
	activeSymbolCount?: number;
}) => {
	if (!isVisibleBoardSymbolIndex(symbolIndex, activeSymbolCount)) return;
	if (rawSymbol.name === 'W') {
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: 'sfx_multiplier_landing',
		});
	}
};

const createDuelSideBoard = () => {
	const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
		const reel = createReelForSpinning({
			reelIndex,
			symbolHeight: SYMBOL_SIZE,
			initialSymbols: INITIAL_BOARD[reelIndex],
			initialSymbolState: INITIAL_SYMBOL_STATE,
			onReelStopping: () => {
				eventEmitter.broadcast({
					type: 'soundOnce',
					name: 'sfx_reel_stop_1',
					forcePlay: !stateBet.isTurbo,
				});
			},
			onSymbolLand,
		});

		reel.reelState.spinOptions = () => {
			const base = reel.reelState.spinType === 'fast' ? SPIN_OPTIONS_FAST : SPIN_OPTIONS_DEFAULT;
			return withReelScrollSpeedMult(base, gameSpeedMultFor(stateGame.gameSpeed));
		};

		return reel;
	});

	const { enhanceBoard } = createEnhanceBoard();
	const enhancedBoard = enhanceBoard({ board });

	return { board, enhancedBoard };
};

export type DuelSideBoardStack = ReturnType<typeof createDuelSideBoard>;

export const stateDuelBoards = $state({
	dog: createDuelSideBoard(),
	cat: createDuelSideBoard(),
});

export const getDuelBoardStack = (side: DuelSide) => stateDuelBoards[side];

/** Symbols that never land in Duel — also strip from fake spin padding. */
const DUEL_FORBIDDEN_PADDING = new Set(['B', 'BT', 'PB', 'PS', 'PG']);

/** basegame padding reels with Bonus / Paw / Bullet replaced (same as math). */
export const getDuelPaddingBoard = (paddingReels: { name: string }[][]) =>
	paddingReels.map((reel) =>
		reel.map((cell) =>
			DUEL_FORBIDDEN_PADDING.has(cell.name) ? { name: 'L2' } : { ...cell },
		),
	);

/** Pad visible 5×4 duel board to Pixi [top, rows…, bottom]. */
export const padDuelBoardForPixi = (
	visibleBoard: { name: string; wild?: boolean; multiplier?: number }[][],
	paddingReels: { name: string }[][],
) => {
	const safePad = getDuelPaddingBoard(paddingReels);
	return visibleBoard.map((reel, reelIndex) => {
		const pad = safePad[reelIndex] ?? [{ name: 'L1' }, { name: 'L1' }];
		return [pad[0], ...reel.map((cell) => ({ ...cell })), pad[1]];
	});
};