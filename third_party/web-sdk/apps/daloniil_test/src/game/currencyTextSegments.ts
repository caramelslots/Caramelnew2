import { stateBet, stateI18n } from 'state-shared';
import {
	bookEventAmountToNormalisedAmount,
	numberToFloat,
} from 'utils-shared/amount';

const NO_LOCALISATION_CURRENCY_MAP: Record<string, string> = {
	XGC: 'GC',
	XSC: 'SC',
};

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

/** Split a formatted currency value: symbol → bablo, digits/separators → krutoi. */
export const amountToCurrencySegments = (
	amount: number,
	bookEvent = false,
): CurrencyTextSegment[] => {
	const value = bookEvent ? bookEventAmountToNormalisedAmount(amount) : amount;
	const segments: CurrencyTextSegment[] = [];

	if (stateBet.currency in NO_LOCALISATION_CURRENCY_MAP) {
		pushSegment(segments, 'symbol', NO_LOCALISATION_CURRENCY_MAP[stateBet.currency]);
		pushSegment(segments, 'body', ` ${numberToFloat(value).toFixed(2)}`);
		return segments;
	}

	const parts = new Intl.NumberFormat(stateI18n.i18n.locale, {
		style: 'currency',
		currency: stateBet.currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		numberingSystem: 'latn',
	}).formatToParts(value);

	for (const part of parts) {
		pushSegment(segments, part.type === 'currency' ? 'symbol' : 'body', part.value);
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
