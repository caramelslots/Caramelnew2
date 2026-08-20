/** Duel bonus state — amounts stored as book cents (×100). */

import { INITIAL_BOARD } from './constants';

export type DuelSide = 'cat' | 'dog';
export type DuelPhase = 'idle' | 'pick' | 'playing' | 'outro';

export type DuelBoardCell = { name: string };

const DUEL_FORBIDDEN = new Set(['B', 'BT', 'PB', 'PS', 'PG']);

/** Visible 5×4 from INITIAL_BOARD (strip top/bottom pad + duel-forbidden symbols). */
export const getDuelInitialVisibleBoard = (): DuelBoardCell[][] =>
	INITIAL_BOARD.map((reel) =>
		reel.slice(1, -1).map((cell) => ({
			name: DUEL_FORBIDDEN.has(cell.name) ? 'L2' : cell.name,
		})),
	);

export const stateDuel = $state({
	active: false,
	phase: 'idle' as DuelPhase,
	/** Side the player chose to play as (null until pick). */
	playerSide: null as DuelSide | null,
	dogSpinIndex: 0,
	catSpinIndex: 0,
	totalSpinsPerSide: 10,
	dogTotal: 0,
	catTotal: 0,
	dogSpinWin: 0,
	catSpinWin: 0,
	/** Last spin win flying into the bank meter. */
	flowAmount: 0,
	flowSide: null as DuelSide | null,
	activeSide: null as DuelSide | null,
	/** Which side currently owns the shared Pixi board (real reel spin). */
	pixiSide: null as DuelSide | null,
	spinning: false,
	dogBoard: getDuelInitialVisibleBoard(),
	catBoard: getDuelInitialVisibleBoard(),
	winner: null as DuelSide | null,
	payout: 0,
	winLevel: 1,
	/** Per-side sticky SW columns (reel → mult), like bonus_normal FS. */
	stickySwByReel: {
		cat: {} as Record<number, number>,
		dog: {} as Record<number, number>,
	},
	stickySwOpened: { cat: false, dog: false },
	superWildCurtain: null as {
		side: DuelSide;
		reel: number;
		mult: number;
		phase: 'expanding' | 'done';
	} | null,
});

export const resetDuelState = () => {
	stateDuel.active = false;
	stateDuel.phase = 'idle';
	stateDuel.playerSide = null;
	stateDuel.dogSpinIndex = 0;
	stateDuel.catSpinIndex = 0;
	stateDuel.totalSpinsPerSide = 10;
	stateDuel.dogTotal = 0;
	stateDuel.catTotal = 0;
	stateDuel.dogSpinWin = 0;
	stateDuel.catSpinWin = 0;
	stateDuel.flowAmount = 0;
	stateDuel.flowSide = null;
	stateDuel.activeSide = null;
	stateDuel.pixiSide = null;
	stateDuel.spinning = false;
	stateDuel.dogBoard = getDuelInitialVisibleBoard();
	stateDuel.catBoard = getDuelInitialVisibleBoard();
	stateDuel.winner = null;
	stateDuel.payout = 0;
	stateDuel.winLevel = 1;
	stateDuel.stickySwByReel = { cat: {}, dog: {} };
	stateDuel.stickySwOpened = { cat: false, dog: false };
	stateDuel.superWildCurtain = null;
};

export const isDuelActive = () => stateDuel.active;

/** Player wins when their chosen side finishes ahead → both banks. */
export const resolveDuelPlayerPayout = (opts: {
	playerSide: DuelSide;
	boardWinner: DuelSide;
	dogTotal: number;
	catTotal: number;
}) => {
	const playerWon = opts.boardWinner === opts.playerSide;
	return {
		playerWon,
		payout: playerWon ? opts.dogTotal + opts.catTotal : 0,
	};
};
