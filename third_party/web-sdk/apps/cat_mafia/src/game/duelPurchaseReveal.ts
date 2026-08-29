/**
 * Cosmetic purchase spin before Duel starts.
 * Lands exactly 3 Bonus (B) symbols on a dead basegame board (no line wins /
 * wilds / feature symbols) so the buy feels like a natural bonus trigger.
 */

import config from './config';
import type { BookEvent } from './typesBookEvent';
import type { Position, RawSymbol, SymbolName } from './types';

const REELS = 5;
const VISIBLE_ROWS = 4;

/** Paying fillers only — no W / SW / paws / bullets / mystery. */
const FILLER_POOL = [
	'L1',
	'L2',
	'L3',
	'L4',
	'H1',
	'H2',
	'H3',
	'H4',
] as const satisfies readonly SymbolName[];

const PAYLINES = Object.values(config.paylines) as number[][];

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(arr: readonly T[]) => arr[rand(arr.length)];
const shuffle = <T>(arr: readonly T[]): T[] => {
	const out = [...arr];
	for (let i = out.length - 1; i > 0; i--) {
		const j = rand(i + 1);
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
};

const padTop = (visibleRow: number) => visibleRow + 1;

/** Left-to-right consecutive paying matches ≥3 on any configured payline. */
const hasLineWin = (visible: SymbolName[][]): boolean => {
	for (const line of PAYLINES) {
		if (line.length < REELS) continue;
		let runSymbol: SymbolName | null = null;
		let run = 0;
		for (let reel = 0; reel < REELS; reel++) {
			const name = visible[reel]![line[reel]!]!;
			if (!(FILLER_POOL as readonly string[]).includes(name)) {
				runSymbol = null;
				run = 0;
				continue;
			}
			if (name === runSymbol) {
				run += 1;
			} else {
				runSymbol = name;
				run = 1;
			}
			if (run >= 3) return true;
		}
	}
	return false;
};

const fillVisibleDead = (): SymbolName[][] => {
	// Safe fallback: alternate highs/lows so no 3-oak can form left-to-right.
	const fallback = (): SymbolName[][] =>
		Array.from({ length: REELS }, (_, reel) =>
			Array.from({ length: VISIBLE_ROWS }, (_, row) => {
				const pool =
					reel % 2 === 0
						? (['L1', 'L2', 'L3', 'L4'] as const)
						: (['H1', 'H2', 'H3', 'H4'] as const);
				return pool[(row + reel) % pool.length]!;
			}),
		);

	for (let attempt = 0; attempt < 80; attempt++) {
		const board = Array.from({ length: REELS }, () =>
			Array.from({ length: VISIBLE_ROWS }, () => pick(FILLER_POOL)),
		);
		if (!hasLineWin(board)) return board;
	}
	return fallback();
};

export type DuelPurchaseRevealBoard = {
	/** Padded 5×6 board for `reveal`. */
	board: RawSymbol[][];
	/** Padded scatter positions for celebrate anim. */
	positions: Position[];
};

/** Build a random dead board with exactly one B on each of three reels. */
export const buildDuelPurchaseRevealBoard = (): DuelPurchaseRevealBoard => {
	const visible = fillVisibleDead();
	const bonusReels = shuffle([0, 1, 2, 3, 4]).slice(0, 3).sort((a, b) => a - b);
	const positions: Position[] = [];

	for (const reel of bonusReels) {
		const visibleRow = rand(VISIBLE_ROWS);
		visible[reel]![visibleRow] = 'B';
		positions.push({ reel, row: padTop(visibleRow) });
	}

	const board: RawSymbol[][] = visible.map((column) => [
		{ name: pick(FILLER_POOL) },
		...column.map((name) =>
			name === 'B' ? ({ name: 'B', scatter: true } as RawSymbol) : ({ name } as RawSymbol),
		),
		{ name: pick(FILLER_POOL) },
	]);

	return { board, positions };
};

/** Book events inserted before `duelStart` when math has no purchase reveal. */
export const buildDuelPurchaseRevealEvents = (startIndex = 0): BookEvent[] => {
	const { board, positions } = buildDuelPurchaseRevealBoard();
	return [
		{
			index: startIndex,
			type: 'reveal',
			board,
			paddingPositions: [10, 20, 5, 15, 8],
			anticipation: [0, 0, 0, 0, 0],
			gameType: 'basegame',
		},
		{
			index: startIndex + 1,
			type: 'setTotalWin',
			amount: 0,
		},
		{
			index: startIndex + 2,
			type: 'duelPurchaseCelebrate',
			positions,
		},
	];
};

/**
 * Prepend cosmetic 3×B purchase spin when a duel book jumps straight to `duelStart`.
 * No-op if a basegame `reveal` already precedes duel (future math books).
 */
export const ensureDuelPurchaseReveal = (events: BookEvent[]): BookEvent[] => {
	const duelStartIdx = events.findIndex((e) => e.type === 'duelStart');
	if (duelStartIdx < 0) return events;

	const prior = events.slice(0, duelStartIdx);
	const hasBaseReveal = prior.some((e) => e.type === 'reveal' && e.gameType === 'basegame');
	const hasCelebrate = prior.some((e) => e.type === 'duelPurchaseCelebrate');
	if (hasBaseReveal && hasCelebrate) return events;
	if (hasBaseReveal && !hasCelebrate) {
		// Reveal already present — only add celebrate using B positions from that board.
		const reveal = prior.find((e) => e.type === 'reveal' && e.gameType === 'basegame');
		if (!reveal || reveal.type !== 'reveal') return events;
		const positions: Position[] = [];
		reveal.board.forEach((reel, reelIndex) => {
			reel.forEach((cell, row) => {
				if (cell.name === 'B' && row >= 1 && row <= VISIBLE_ROWS) {
					positions.push({ reel: reelIndex, row });
				}
			});
		});
		if (positions.length < 3) return events;
		const injected: BookEvent[] = [
			...prior,
			{ index: 0, type: 'duelPurchaseCelebrate', positions: positions.slice(0, 3) },
			...events.slice(duelStartIdx),
		];
		return reindexBookEvents(injected);
	}

	const purchase = buildDuelPurchaseRevealEvents(0);
	return reindexBookEvents([...purchase, ...events.slice(duelStartIdx)]);
};

const reindexBookEvents = (events: BookEvent[]): BookEvent[] =>
	events.map((event, index) => ({ ...event, index }));
