/**
 * Dual Pixi reel boards for Duel — same createReelForSpinning / enhanceBoard
 * pipeline as the main base board, one stack per side.
 */
import _ from 'lodash';
import { stateBet } from 'state-shared';
import { createEnhanceBoard, createReelForSpinning } from 'utils-slots';

import {
	BOARD_DIMENSIONS,
	INITIAL_SYMBOL_STATE,
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	SYMBOL_SIZE,
	createInitialBoard,
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

/** Symbols that never land in Duel — also strip from fake spin padding. */
const DUEL_FORBIDDEN_PADDING = new Set(['B', 'BD', 'BT', 'PB', 'PS', 'PG']);

const createDuelSideBoard = () => {
	const initialBoard = createInitialBoard({ exclude: DUEL_FORBIDDEN_PADDING });
	const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
		const reel = createReelForSpinning({
			reelIndex,
			symbolHeight: SYMBOL_SIZE,
			initialSymbols: initialBoard[reelIndex],
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

/** Bonus / Duel Bonus never land during Normal / Super FS — strip from scroll padding. */
const FS_FORBIDDEN_PADDING = new Set(['B', 'BD']);

/** Match math `max_sticky_sw` — no SW scroll art on non-sticky reels once at cap. */
export const MAX_STICKY_SW = 2;

const stripSwPaddingWhenAtCap = (
	reel: { name: string }[],
	reelIndex: number,
	stickySwByReel: Record<number, number | undefined> | undefined,
) => {
	const stickyReels = new Set(Object.keys(stickySwByReel ?? {}).map(Number));
	if (stickyReels.size < MAX_STICKY_SW || stickyReels.has(reelIndex)) return reel;
	return reel.map((cell) => (cell.name === 'SW' ? { name: 'L2' } : { ...cell }));
};

/** basegame padding reels with Bonus / Paw / Bullet replaced (same as math). */
export const getDuelPaddingBoard = (
	paddingReels: { name: string }[][],
	stickySwByReel?: Record<number, number | undefined>,
) =>
	paddingReels.map((reel, reelIndex) => {
		const stripped = stripSwPaddingWhenAtCap(
			reel.map((cell) =>
				DUEL_FORBIDDEN_PADDING.has(cell.name) ? { name: 'L2' } : { ...cell },
			),
			reelIndex,
			stickySwByReel,
		);
		return stripped;
	});

/** freegame padding reels with Bonus removed (B cannot land in FS). */
export const getFreegamePaddingBoard = (
	paddingReels: { name: string }[][],
	stickySwByReel?: Record<number, number | undefined>,
) =>
	paddingReels.map((reel, reelIndex) => {
		const stripped = reel.map((cell) =>
			FS_FORBIDDEN_PADDING.has(cell.name) ? { name: 'L2' } : { ...cell },
		);
		return stripSwPaddingWhenAtCap(stripped, reelIndex, stickySwByReel);
	});

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