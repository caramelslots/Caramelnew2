/**
 * Mock Duel books for local fallback.
 * Amounts match math books: book cents (×100 bet multiples).
 * `playerSide` selects which bank must win for the player to be paid.
 */

import type { BookEvent, Bet } from './typesBookEvent';
import type { RawSymbol, SymbolName } from './types';

const POOL = ['L1', 'L2', 'L3', 'L4', 'H1', 'H2', 'H3', 'H4', 'W', 'SW'] as const satisfies readonly SymbolName[];

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(arr: readonly T[]) => arr[rand(arr.length)];
const toCents = (mult: number) => Math.round(mult * 100);

const makeBoard = (): RawSymbol[][] =>
	Array.from({ length: 5 }, () =>
		Array.from({ length: 4 }, () => ({ name: pick(POOL) })),
	);

/** Spin wins in bet multiples — bias favors `favored` board. */
const spinWinFor = (side: 'cat' | 'dog', index: number, favored: 'cat' | 'dog'): number => {
	const base = [0, 0.4, 0.8, 1.2, 0, 2.5, 0.6, 3.0, 0, 1.5][index - 1] ?? 0;
	if (favored === 'cat') {
		return side === 'cat' ? base * 2.2 + (index % 2 === 0 ? 2.5 : 0.8) : base * 0.45;
	}
	return side === 'dog' ? base * 2.0 + (index % 2 === 0 ? 2.2 : 0.6) : base * 0.4;
};

const buildSpins = (playerSide: 'cat' | 'dog', playerWon: boolean): BookEvent[] => {
	const events: BookEvent[] = [];
	let dogTotal = 0;
	let catTotal = 0;
	let index = 1;
	const favored = playerWon ? playerSide : playerSide === 'cat' ? 'dog' : 'cat';

	for (let i = 1; i <= 10; i++) {
		for (const side of ['cat', 'dog'] as const) {
			const spinWin = Number(spinWinFor(side, i, favored).toFixed(2));
			if (side === 'cat') catTotal = Number((catTotal + spinWin).toFixed(2));
			else dogTotal = Number((dogTotal + spinWin).toFixed(2));

			events.push({
				index: index++,
				type: 'duelSpin',
				side,
				spinIndex: i,
				board: makeBoard(),
				spinWin: toCents(spinWin),
			});
			events.push({
				index: index++,
				type: 'duelBankUpdate',
				side,
				spinWin: toCents(spinWin),
				sideTotal: toCents(side === 'cat' ? catTotal : dogTotal),
				dogTotal: toCents(dogTotal),
				catTotal: toCents(catTotal),
			});
		}
	}

	if (dogTotal === catTotal) {
		catTotal = Number((catTotal + 0.5).toFixed(2));
	}

	let winner: 'cat' | 'dog' = catTotal > dogTotal ? 'cat' : 'dog';
	if (winner !== favored) {
		if (favored === 'cat') catTotal = Number((dogTotal + 5).toFixed(2));
		else dogTotal = Number((catTotal + 5).toFixed(2));
		winner = favored;
	}

	const didWin = winner === playerSide;
	const payout = didWin ? Number((dogTotal + catTotal).toFixed(2)) : 0;
	const winLevel =
		payout <= 0
			? 1
			: payout >= 100
				? 8
				: payout >= 50
					? 7
					: payout >= 10
						? 6
						: payout >= 3
							? 4
							: 3;

	events.push({
		index: index++,
		type: 'duelEnd',
		dogTotal: toCents(dogTotal),
		catTotal: toCents(catTotal),
		winner,
		payout: toCents(payout),
		winLevel,
		playerSide,
		playerWon: didWin,
	});

	events.push({ index: index++, type: 'finalWin', amount: toCents(payout) });

	return events;
};

export const buildDuelMockBook = (
	playerSide: 'cat' | 'dog' = 'cat',
	outcome: 'win' | 'lose' = 'win',
): Bet => {
	const playerWon = outcome === 'win';
	const events: BookEvent[] = [
		{ index: 0, type: 'duelStart', totalSpinsPerSide: 10, playerSide },
		...buildSpins(playerSide, playerWon),
	];
	// Purchase 3×B reveal is injected in playBet via ensureDuelPurchaseReveal.
	const end = events.find((e) => e.type === 'duelEnd');
	const payoutCents = end && end.type === 'duelEnd' ? end.payout : 0;

	return {
		id: playerSide === 'cat' ? (playerWon ? 900001 : 900002) : playerWon ? 900003 : 900004,
		type: 'bet',
		amount: 1,
		payoutMultiplier: payoutCents,
		events,
		state: events,
		mode: playerSide === 'cat' ? 'bonus_duel_cat' : 'bonus_duel_dog',
	} as Bet;
};

export const DUEL_MOCK_BOOK_CAT_WINS = buildDuelMockBook('cat', 'win');
export const DUEL_MOCK_BOOK_DOG_WINS = buildDuelMockBook('dog', 'win');
export const DUEL_MOCK_BOOK_CAT_LOSES = buildDuelMockBook('cat', 'lose');
export const DUEL_MOCK_BOOK_DOG_LOSES = buildDuelMockBook('dog', 'lose');
