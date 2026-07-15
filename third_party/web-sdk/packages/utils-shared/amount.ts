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

/** Integer API micro-units for a display/currency value (avoids binary float leftovers). */
export const toApiMicros = (value: number) =>
	Math.round(numberToFloat(value) * API_AMOUNT_MULTIPLIER);

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

const formatPlainAmount = (value: number, decimals: number) =>
	value.toLocaleString(stateI18n.i18n.locale || 'en', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
		useGrouping: true,
	});

/**
 * Win amount body (no currency symbol).
 * Default: currency decimals (USD → 2, `$16.30`).
 * Extra digits only when the amount truly has sub-cent precision (`$0.075`).
 */
export const formatWinAmountBody = (value: number, currency = stateBet.currency) => {
	const meta = getCurrencyMeta(currency);
	const minDigits = Math.max(0, meta.decimals);
	const micros = Math.abs(toApiMicros(value));
	const sign = toApiMicros(value) < 0 ? '-' : '';
	const whole = Math.floor(micros / API_AMOUNT_MULTIPLIER);
	const fracMicros = micros % API_AMOUNT_MULTIPLIER;

	const wholeFormatted = whole.toLocaleString(stateI18n.i18n.locale || 'en', {
		useGrouping: true,
		maximumFractionDigits: 0,
		numberingSystem: 'latn',
	});

	if (meta.decimals <= 0) {
		// JPY / XGC: no fraction unless there is a real fractional remainder.
		if (fracMicros === 0) return `${sign}${wholeFormatted}`;
	}

	// Unit for currency decimals in micros (USD 2dp → 10_000 micros = $0.01).
	const currencyUnit =
		minDigits > 0 ? 10 ** (WIN_AMOUNT_MAX_FRACTION_DIGITS - minDigits) : API_AMOUNT_MULTIPLIER;
	const hasSubCurrencyPrecision = minDigits > 0 && fracMicros % currencyUnit !== 0;

	let fracStr: string;
	if (!hasSubCurrencyPrecision) {
		// Default: exactly currency decimals ( Balancе/Bet-like 2dp for USD ).
		const roundedFrac =
			minDigits > 0
				? Math.round(fracMicros / currencyUnit) % 10 ** minDigits
				: 0;
		// Handle round-up carrying into whole (e.g. 0.999999 → next dollar) — rare after toApiMicros.
		fracStr = String(roundedFrac).padStart(minDigits, '0');
	} else {
		// Real sub-cent win — keep needed digits, trim trailing zeros.
		fracStr = String(fracMicros).padStart(WIN_AMOUNT_MAX_FRACTION_DIGITS, '0');
		while (fracStr.length > minDigits && fracStr.endsWith('0')) {
			fracStr = fracStr.slice(0, -1);
		}
	}

	if (!fracStr) {
		return `${sign}${wholeFormatted}`;
	}

	return `${sign}${wholeFormatted}.${fracStr}`;
};

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

/** Win displays — significant API digits only (trim trailing zeros; min = currency decimals). */
export const numberToWinCurrencyString = (value: number) => {
	const meta = getCurrencyMeta();
	const formatted = formatWinAmountBody(value);

	if (meta.symbolAfter) {
		return `${formatted} ${meta.symbol}`;
	}
	return `${meta.symbol}${formatted}`;
};

export const bookEventAmountToCurrencyString = (bookEventAmount: number) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	return numberToWinCurrencyString(normalisedAmount);
};
