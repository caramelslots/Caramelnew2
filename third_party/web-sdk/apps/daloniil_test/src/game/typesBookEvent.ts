import type { BetType } from 'rgs-requests';

import type { SymbolName, RawSymbol, GameType, Position } from './types';

// book events shared with scatter game
type BookEventReveal = {
	index: number;
	type: 'reveal';
	board: RawSymbol[][];
	paddingPositions: number[];
	anticipation: number[];
	gameType: GameType;
};

type BookEventSetTotalWin = {
	index: number;
	type: 'setTotalWin';
	amount: number;
};

type BookEventFinalWin = {
	index: number;
	type: 'finalWin';
	amount: number;
};

type BookEventFreeSpinTrigger = {
	index: number;
	type: 'freeSpinTrigger';
	totalFs: number;
	positions: Position[];
};

type BookEventUpdateFreeSpin = {
	index: number;
	type: 'updateFreeSpin';
	amount: number;
	total: number;
};

type BookEventSetWin = {
	index: number;
	type: 'setWin';
	amount: number;
	winLevel: number;
};

type BookEventFreeSpinEnd = {
	index: number;
	type: 'freeSpinEnd';
	amount: number;
	winLevel: number;
};

type BookEventWinInfo = {
	index: number;
	type: 'winInfo';
	totalWin: number;
	wins: {
		symbol: SymbolName;
		kind: number;
		win: number;
		positions: Position[];
		meta: {
			lineIndex: number;
			multiplier: number;
			winWithoutMult: number;
			globalMult: number;
			lineMultiplier: number;
		};
	}[];
};

// customised
type BookEventCreateBonusSnapshot = {
	index: number;
	type: 'createBonusSnapshot';
	bookEvents: BookEvent[];
};

// === Cash Stacks specific ===

// Игрок собрал N бонус-символов в текущем FS-цикле.
type BookEventBonusCollect = {
	index: number;
	type: 'bonusCollect';
	positions: Position[];
	collectedTotal: number;
	collectedDelta: number;
};

// Достигнут новый уровень Progress Ladder (+spins, изменение tier).
type BookEventLadderTierUp = {
	index: number;
	type: 'ladderTierUp';
	previousTier: number;
	newTier: number;
	rewardSpins: number;
	rewardedMysteryReels?: number;
};

// Активируется новый Sticky Mystery Reel(s) на FS (технический факт).
type BookEventMysteryReelActivate = {
	index: number;
	type: 'mysteryReelActivate';
	reels: number[];
	persistent: boolean;
};

// Игрок РАЗБЛОКИРОВАЛ новый Sticky Mystery Reel через Progress Ladder
// (collect 4 B = +1 reel). Эмитится ТОЛЬКО при ladder-tier-up,
// НЕ при bonus_super starting reel. Триггерит celebration overlay.
type BookEventMysteryReelUnlock = {
	index: number;
	type: 'mysteryReelUnlock';
	reels: number[];
	tierAfter: number;
	rewardSpins: number;
};

// Mystery символ раскрылся в обычный символ.
type BookEventMysteryReveal = {
	index: number;
	type: 'mysteryReveal';
	revealedSymbol: SymbolName;
	positions: Position[];
};

export type BookEvent =
	| BookEventReveal
	| BookEventWinInfo
	| BookEventSetTotalWin
	| BookEventFreeSpinTrigger
	| BookEventUpdateFreeSpin
	| BookEventCreateBonusSnapshot
	| BookEventFinalWin
	| BookEventSetWin
	| BookEventFreeSpinEnd
	// Cash Stacks customised
	| BookEventBonusCollect
	| BookEventLadderTierUp
	| BookEventMysteryReelActivate
	| BookEventMysteryReelUnlock
	| BookEventMysteryReveal;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
