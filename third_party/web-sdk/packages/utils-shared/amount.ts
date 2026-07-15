import { stateI18n } from 'state-shared';

import { API_AMOUNT_MULTIPLIER, BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { stateBet } from 'state-shared';

/**
 * Stake-supported currency display metadata (aligned with ts-client helpers).
 * Decimals drive Balance / Bet display; wins still allow up to API precision.
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
};

/** API amounts are micro-units (1_000_000 = 1.00). Wins may need up to this many fraction digits. */
export const WIN_AMOUNT_MAX_FRACTION_DIGITS = Math.round(Math.log10(API_AMOUNT_MULTIPLIER));

export const numberToFloat = (value: number) => Number.parseFloat(`${value}`);

export const getCurrencyMeta = (currency = stateBet.currency) =>
	CURRENCY_META[currency] ?? { symbol: currency, decimals: 2, symbolAfter: true };

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
export const quantizeToApiAmount = (value: number) =>
	Math.round(numberToFloat(value) * API_AMOUNT_MULTIPLIER) / API_AMOUNT_MULTIPLIER;

export const bookEventAmountToNormalisedAmount = (bookEventAmount: number) => {
	// Exact: (bet micro-units × book amount) / (BOOK × API)
	const betMicro = Math.round(stateBet.wageredBetAmount * API_AMOUNT_MULTIPLIER);
	return (betMicro * bookEventAmount) / (BOOK_AMOUNT_MULTIPLIER * API_AMOUNT_MULTIPLIER);
};

const formatPlainAmount = (value: number, decimals: number) =>
	value.toLocaleString(stateI18n.i18n.locale || 'en', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
		useGrouping: true,
	});

/** Balance / bet / costs — currency-native decimals (XGC=0, USD=2, JPY=0, …). */
export const numberToCurrencyString = (value: number) => {
	const amount = quantizeToApiAmount(value);
	const meta = getCurrencyMeta();
	const formatted = formatPlainAmount(amount, meta.decimals);

	if (meta.symbolAfter) {
		return `${formatted} ${meta.symbol}`;
	}
	return `${meta.symbol}${formatted}`;
};

/** Win displays — full API precision (up to 6dp), without rounding down to currency cents. */
export const numberToWinCurrencyString = (value: number) => {
	const amount = quantizeToApiAmount(value);
	const meta = getCurrencyMeta();
	const minDigits = meta.decimals;
	const formatted = amount.toLocaleString(stateI18n.i18n.locale || 'en', {
		minimumFractionDigits: minDigits,
		maximumFractionDigits: WIN_AMOUNT_MAX_FRACTION_DIGITS,
		useGrouping: true,
	});

	if (meta.symbolAfter) {
		return `${formatted} ${meta.symbol}`;
	}
	return `${meta.symbol}${formatted}`;
};

export const bookEventAmountToCurrencyString = (bookEventAmount: number) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	return numberToWinCurrencyString(normalisedAmount);
};
