/**
 * RGS demo sessions often still serve Wok Fury (Mystery/ladder) books.
 * Until 0_0_cat_mafia is deployed on RGS, buy-bonus modes always play local
 * Cat Mafia fixtures: target-pick → bullets → shoot.
 */
import { stateBet } from 'state-shared';

import type { Bet, BookEvent } from './typesBookEvent';
import bonusBooks from '../stories/data/bonus_books';
import bonusSuperBooks from '../stories/data/books_bonus_super';

type MathBook = {
	id: number;
	payoutMultiplier?: number;
	events: BookEvent[];
};

const isBuyMode = (key: string) => key === 'bonus_normal' || key === 'bonus_super';

const pickLocalBuyBook = (modeKey: string): MathBook => {
	const pool = (
		modeKey === 'bonus_super' ? bonusSuperBooks : bonusBooks
	) as MathBook[];
	return pool[Math.floor(Math.random() * pool.length)];
};

/** Returns a Cat Mafia-safe bet (buy modes → local books). */
export const sanitizeBetForCatMafia = (bet: Bet): Bet => {
	const modeKey = stateBet.activeBetModeKey;
	if (!isBuyMode(modeKey)) return bet;

	const local = pickLocalBuyBook(modeKey);
	// eslint-disable-next-line no-console
	console.warn(`[Cat Mafia] buy ${modeKey}: using local book id=${local.id}`);

	return {
		...bet,
		state: local.events,
		payoutMultiplier: local.payoutMultiplier ?? bet.payoutMultiplier,
	} as Bet;
};
