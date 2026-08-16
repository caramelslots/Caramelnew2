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

// === Wok Fury specific ===

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

/** Cat Mafia: Paw coin converts its row(s) into coins (XOR with superWildExpand).
 *  PB (bronze) → 1 row, PS (silver) → 2 rows, PG (gold) → 3 rows.
 *  The paw cell itself is emitted with coinTier 0 / win 0 — it never pays. */
export type BookEventPawCoinResolve = {
	index: number;
	type: 'pawCoinResolve';
	paws: (Position & { kind?: 'bronze' | 'silver' | 'gold' })[];
	rows: {
		row: number;
		cells: {
			reel: number;
			from: SymbolName;
			coinTier: 0 | 1 | 2 | 3;
			win: number;
		}[];
	}[];
	totalCoinWin: number;
};

/** Cat Mafia: Super Wild expands into a curtain column (XOR with pawCoinResolve). */
export type BookEventSuperWildExpand = {
	index: number;
	type: 'superWildExpand';
	expands: { reel: number; row: number; mult: number }[];
	productMult: number;
	/** Optional board after expand (padded). If omitted, handler mutates column to wild. */
	boardAfter?: RawSymbol[][];
};

/** Cat Mafia Stage C: pick a target for FS count (feel of choice; result predetermined). */
export type BookEventFreeSpinTargetPick = {
	index: number;
	type: 'freeSpinTargetPick';
	/** Length 6; each value in {8,10,12}. */
	targets: number[];
	/** Predetermined winning slot (0..5). */
	chosenIndex: number;
	/** === targets[chosenIndex]; used as freeSpinTrigger.totalFs. */
	awardedFs: number;
};

/** Cat Mafia Stage D: collect bullets into revolver drum (main FS only). */
export type BookEventBulletCollect = {
	index: number;
	type: 'bulletCollect';
	bullets: Position[];
	/** Drum count after collect (capped at 6). */
	drumCount: number;
};

/** Cat Mafia Stage E: auto shoot after main FS — one round only. */
export type BookEventTargetShootRound = {
	index: number;
	type: 'targetShootRound';
	shots: { targetIndex: number; reward: 0 | 1 | 2 | 3 }[];
	/** Sum of rewards; extra spins awarded after this event. */
	extraFs: number;
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
	// Wok Fury customised
	| BookEventBonusCollect
	| BookEventLadderTierUp
	| BookEventMysteryReelActivate
	| BookEventMysteryReelUnlock
	| BookEventMysteryReveal
	// Cat Mafia Stage B / C / D
	| BookEventPawCoinResolve
	| BookEventSuperWildExpand
	| BookEventFreeSpinTargetPick
	| BookEventBulletCollect
	| BookEventTargetShootRound;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
