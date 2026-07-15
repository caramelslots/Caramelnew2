import { stateBet } from 'state-shared';
import {
	bookEventAmountToNormalisedAmount,
	formatWinAmountBody,
	getCurrencyMeta,
} from 'utils-shared/amount';

export type CurrencyTextSegment = { kind: 'symbol' | 'body'; text: string };

export type CurrencyLayoutParts = {
	/** Localised label before the amount (e.g. HUD "WIN "). */
	label: string;
	before: string;
	symbol: string;
	after: string;
};

const pushSegment = (
	segments: CurrencyTextSegment[],
	kind: CurrencyTextSegment['kind'],
	text: string,
) => {
	if (!text) return;
	const last = segments[segments.length - 1];
	if (last?.kind === kind) {
		last.text += text;
	} else {
		segments.push({ kind, text });
	}
};

/**
 * Split a formatted win amount: symbol → bablo, digits/separators → krutoi.
 * Uses authenticate currency (including social XGC/XSC). Balance/Bet use numberToCurrencyString.
 * Win body keeps necessary precision only (e.g. $0.075), not float noise like $16.300023.
 */
export const amountToCurrencySegments = (
	amount: number,
	bookEvent = false,
): CurrencyTextSegment[] => {
	const value = bookEvent ? bookEventAmountToNormalisedAmount(amount) : amount;
	const meta = getCurrencyMeta(stateBet.currency);
	const segments: CurrencyTextSegment[] = [];
	const body = formatWinAmountBody(value, stateBet.currency);

	if (meta.symbolAfter) {
		pushSegment(segments, 'body', body);
		pushSegment(segments, 'symbol', ` ${meta.symbol}`);
	} else {
		pushSegment(segments, 'symbol', meta.symbol);
		pushSegment(segments, 'body', body);
	}

	return segments;
};

/** Flatten segments into before/symbol/after for at-most-3 BitmapText layout. */
export const segmentsToLayoutParts = (segments: CurrencyTextSegment[]): CurrencyLayoutParts => {
	let before = '';
	let symbol = '';
	let after = '';
	let seenSymbol = false;

	for (const seg of segments) {
		if (seg.kind === 'symbol') {
			symbol += seg.text;
			seenSymbol = true;
		} else if (!seenSymbol) {
			before += seg.text;
		} else {
			after += seg.text;
		}
	}

	return { label: '', before, symbol, after };
};

export const amountToLayoutParts = (
	amount: number,
	options?: { bookEvent?: boolean; prefix?: string },
): CurrencyLayoutParts => {
	const segments = amountToCurrencySegments(amount, options?.bookEvent);
	const { before, symbol, after } = segmentsToLayoutParts(segments);
	return {
		label: options?.prefix ?? '',
		before,
		symbol,
		after,
	};
};
