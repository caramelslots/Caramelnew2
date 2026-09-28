import { stateI18n } from 'state-shared';

import { API_AMOUNT_MULTIPLIER, BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { stateBet } from 'state-shared';

/**
 * Currency display metadata — symbol / placement only.
 * Amount precision is never taken from `decimals`: we always show what the
 * API micro value contains (dynamic fraction digits).
 */
const CURRENCY_META: Record<
	string,
	{ symbol: string; decimals: number; symbolAfter?: boolean }
> = {
	USD: { symbol: '$', decimals: 2 },
	CAD: { symbol: 'CA$', decimals: 2 },
	JPY: { symbol: '¥', decimals: 0 },
	EUR: { symbol: '€', decimals: 2 },
	RUB: { symbol: '₽', decimals: 2 },
	CNY: { symbol: 'CN¥', decimals: 2 },
	PHP: { symbol: '₱', decimals: 2 },
	INR: { symbol: '₹', decimals: 2 },
	IDR: { symbol: 'Rp', decimals: 0 },
	KRW: { symbol: '₩', decimals: 0 },
	BRL: { symbol: 'R$', decimals: 2 },
	MXN: { symbol: 'MX$', decimals: 2 },
	DKK: { symbol: 'KR', decimals: 2, symbolAfter: true },
	PLN: { symbol: 'zł', decimals: 2, symbolAfter: true },
	VND: { symbol: '₫', decimals: 0, symbolAfter: true },
	TRY: { symbol: '₺', decimals: 2 },
	CLP: { symbol: 'CLP', decimals: 0, symbolAfter: true },
	ARS: { symbol: 'ARS', decimals: 2, symbolAfter: true },
	PEN: { symbol: 'S/', decimals: 2, symbolAfter: true },
	NGN: { symbol: '₦', decimals: 0 },
	SAR: { symbol: 'SAR', decimals: 2, symbolAfter: true },
	ILS: { symbol: 'ILS', decimals: 2, symbolAfter: true },
	AED: { symbol: 'AED', decimals: 2, symbolAfter: true },
	TWD: { symbol: 'NT$', decimals: 2 },
	NOK: { symbol: 'kr', decimals: 2 },
	KWD: { symbol: 'KD', decimals: 2 },
	JOD: { symbol: 'JD', decimals: 2 },
	CRC: { symbol: '₡', decimals: 2 },
	TND: { symbol: 'TND', decimals: 2, symbolAfter: true },
	SGD: { symbol: 'SG$', decimals: 2 },
	MYR: { symbol: 'RM', decimals: 2 },
	OMR: { symbol: 'OMR', decimals: 2, symbolAfter: true },
	QAR: { symbol: 'QAR', decimals: 2, symbolAfter: true },
	BHD: { symbol: 'BD', decimals: 2 },
	XGC: { symbol: 'GC', decimals: 0, symbolAfter: true },
	XSC: { symbol: 'SC', decimals: 2, symbolAfter: true },
	/** Stake EU Social Mode cash — display as SC (same label as XSC / Stake US). */
	XEC: { symbol: 'SC', decimals: 2, symbolAfter: true },
};

const SOCIAL_CURRENCY_CODES = new Set(['XGC', 'XSC', 'XEC']);

export const isSocialCurrencyCode = (currency?: string) =>
	SOCIAL_CURRENCY_CODES.has(String(currency ?? '').trim().toUpperCase());

/** API amounts are micro-units (1_000_000 = 1.00). Wins may need up to this many fraction digits. */
export const WIN_AMOUNT_MAX_FRACTION_DIGITS = Math.round(Math.log10(API_AMOUNT_MULTIPLIER));

/** Strip binary float junk without string round-trips (hot path during win count-up). */
export const numberToFloat = (value: number) =>
	Math.round(value * API_AMOUNT_MULTIPLIER) / API_AMOUNT_MULTIPLIER;

export const getCurrencyMeta = (currency = stateBet.currency) => {
	const code = String(currency ?? '')
		.trim()
		.toUpperCase();
	return CURRENCY_META[code] ?? { symbol: code || String(currency ?? ''), decimals: 2, symbolAfter: true };
};

/** @deprecated Prefer dynamic API precision — kept for callers that still read meta.decimals. */
export const getCurrencyDisplayDecimals = (currency = stateBet.currency) =>
	getCurrencyMeta(currency).decimals;

// bookEventAmount: is the amount or win numbers in the events of books, e.g. the amount in setTotalWin bookEvent
// {
// 	"index": 3,
// 	"type": "setTotalWin",
// 	"amount": 100
// },
// if betting on $1,   100 bookEventAmount equals to $1.    betAmountMultiplier is (100 / BOOK_AMOUNT_MULTIPLIER =) 1
// if betting on $1,    50 bookEventAmount equals to $0.5.  betAmountMultiplier is ( 50 / BOOK_AMOUNT_MULTIPLIER =) 0.5
// if betting on $0.5, 100 bookEventAmount equals to $0.5.  betAmountMultiplier is (100 / BOOK_AMOUNT_MULTIPLIER =) 1
// if betting on $0.5,  50 bookEventAmount equals to $0.25. betAmountMultiplier is ( 50 / BOOK_AMOUNT_MULTIPLIER =) 0.5

export const bookEventAmountToBetAmountMultiplier = (bookEventAmount: number) =>
	bookEventAmount / BOOK_AMOUNT_MULTIPLIER;

/** Quantize to API micro-units so float noise does not invent extra digits. */
export const quantizeToApiAmount = (value: number) => numberToFloat(value);

/** Integer API micro-units for a display/currency value (avoids binary float leftovers). */
export const toApiMicros = (value: number) => Math.round(value * API_AMOUNT_MULTIPLIER);

export const bookEventAmountToNormalisedAmount = (bookEventAmount: number) => {
	// Exact via integer micros: round(betMicro × book / BOOK) / API
	const betMicro = toApiMicros(stateBet.wageredBetAmount);
	// Count-up tweens and float maths can leave tiny fractions on otherwise
	// integer book amounts (e.g. 1630.0023). Snap those; keep real fractions
	// needed for sub-cent wins (7.5 → $0.075, 12.3456 → $0.123456).
	const nearestInt = Math.round(bookEventAmount);
	const book =
		Math.abs(bookEventAmount - nearestInt) < 0.005 ? nearestInt : bookEventAmount;
	const winMicro = Math.round((betMicro * book) / BOOK_AMOUNT_MULTIPLIER);
	return winMicro / API_AMOUNT_MULTIPLIER;
};

const wholeFormatters = new Map<string, Intl.NumberFormat>();
const formatWholeGrouped = (whole: number, locale: string) => {
	let formatter = wholeFormatters.get(locale);
	if (!formatter) {
		formatter = new Intl.NumberFormat(locale, {
			useGrouping: true,
			maximumFractionDigits: 0,
			numberingSystem: 'latn',
		});
		wholeFormatters.set(locale, formatter);
	}
	return formatter.format(whole);
};

/**
 * Amount body from API micros — same for every currency.
 * At least 2 fraction digits; expand when the value has more
 * (10 → "10.00", 19.5 → "19.50", 0.075 → "0.075").
 * No rounding away fractional micros.
 */
export const formatAmountBody = (value: number) => {
	const signedMicros = toApiMicros(value);
	const sign = signedMicros < 0 ? '-' : '';
	const micros = Math.abs(signedMicros);
	const whole = Math.floor(micros / API_AMOUNT_MULTIPLIER);
	const fracMicros = micros % API_AMOUNT_MULTIPLIER;
	const wholeFormatted = formatWholeGrouped(whole, stateI18n.i18n.locale || 'en');

	const minFractionDigits = 2;
	let fracStr = String(fracMicros).padStart(WIN_AMOUNT_MAX_FRACTION_DIGITS, '0');
	while (fracStr.length > minFractionDigits && fracStr.endsWith('0')) {
		fracStr = fracStr.slice(0, -1);
	}
	if (fracStr.length < minFractionDigits) {
		fracStr = fracStr.padEnd(minFractionDigits, '0');
	}
	return `${sign}${wholeFormatted}.${fracStr}`;
};

/** @deprecated Use formatAmountBody — same dynamic precision for all currencies. */
export const formatSocialAmountBody = (value: number) => formatAmountBody(value);

/**
 * How many fraction digits the value actually needs (from API micros).
 * At least 2 — matches formatAmountBody. Used to lock HUD count-up width.
 */
export const winAmountSignificantFractionDigits = (
	value: number,
	_currency = stateBet.currency,
): number => {
	const minFractionDigits = 2;
	const micros = Math.abs(toApiMicros(value));
	const fracMicros = micros % API_AMOUNT_MULTIPLIER;
	if (fracMicros === 0) return minFractionDigits;
	let fracStr = String(fracMicros).padStart(WIN_AMOUNT_MAX_FRACTION_DIGITS, '0');
	while (fracStr.length > minFractionDigits && fracStr.endsWith('0')) {
		fracStr = fracStr.slice(0, -1);
	}
	return Math.max(minFractionDigits, fracStr.length);
};

/**
 * HUD count-up: lock fraction digits to the max needed by from/to (no float-noise
 * millionths), and skip animation when there aren't at least 2 steps at that unit
 * (e.g. $0 → $0.001).
 */
export const resolveWinCountUpFormat = (
	fromValue: number,
	toValue: number,
	currency = stateBet.currency,
): { fractionDigits: number; canAnimate: boolean } => {
	const fractionDigits = Math.max(
		winAmountSignificantFractionDigits(fromValue, currency),
		winAmountSignificantFractionDigits(toValue, currency),
	);
	const unitMicros = 10 ** (WIN_AMOUNT_MAX_FRACTION_DIGITS - fractionDigits);
	const steps = Math.round(
		Math.abs(toApiMicros(toValue) - toApiMicros(fromValue)) / Math.max(1, unitMicros),
	);
	return { fractionDigits, canAnimate: steps >= 2 };
};

/**
 * Amount body (no currency symbol).
 * Default / significant: dynamic API precision for every currency.
 * `fractionDigits` only locks width during HUD count-up (pads to that many digits).
 */
export const formatWinAmountBody = (
	value: number,
	_currency = stateBet.currency,
	options?: { fractionDigits?: number; significant?: boolean },
) => {
	if (options?.fractionDigits == null) {
		return formatAmountBody(value);
	}

	const digits = Math.max(
		0,
		Math.min(WIN_AMOUNT_MAX_FRACTION_DIGITS, Math.floor(options.fractionDigits)),
	);
	const signedMicros = toApiMicros(value);
	const sign = signedMicros < 0 ? '-' : '';
	const micros = Math.abs(signedMicros);
	let whole = Math.floor(micros / API_AMOUNT_MULTIPLIER);
	const fracMicros = micros % API_AMOUNT_MULTIPLIER;
	const wholeFormatted = formatWholeGrouped(whole, stateI18n.i18n.locale || 'en');

	if (digits <= 0) {
		return `${sign}${wholeFormatted}`;
	}

	const digitUnit = 10 ** (WIN_AMOUNT_MAX_FRACTION_DIGITS - digits);
	let roundedFrac = Math.round(fracMicros / digitUnit);
	const fracMod = 10 ** digits;
	if (roundedFrac >= fracMod) {
		roundedFrac = 0;
		whole += 1;
	}
	const fracStr = String(roundedFrac).padStart(digits, '0');
	return `${sign}${formatWholeGrouped(whole, stateI18n.i18n.locale || 'en')}.${fracStr}`;
};

const withCurrencySymbol = (body: string, currency?: string) => {
	const meta = getCurrencyMeta(currency);
	if (meta.symbolAfter) {
		return `${body} ${meta.symbol}`;
	}
	return `${meta.symbol}${body}`;
};

/** Balance / bet / costs — dynamic precision (what the value has, all currencies). */
export const numberToCurrencyString = (value: number) =>
	withCurrencySymbol(formatAmountBody(value));

/** Win displays — same dynamic precision for every currency. */
export const numberToWinCurrencyString = (value: number) =>
	withCurrencySymbol(formatAmountBody(value));

/** Bet replay amounts — same dynamic precision for every currency. */
export const numberToReplayCurrencyString = (
	value: number,
	currency: string = stateBet.currency,
) => withCurrencySymbol(formatAmountBody(value), currency);

/** Bet replay total win/prize — same as other replay amounts. */
export const numberToReplayWinCurrencyString = (
	value: number,
	currency: string = stateBet.currency,
) => numberToReplayCurrencyString(value, currency);

export const bookEventAmountToCurrencyString = (bookEventAmount: number) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	return numberToWinCurrencyString(normalisedAmount);
};
