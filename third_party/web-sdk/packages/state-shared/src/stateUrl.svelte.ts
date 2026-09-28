import { locales } from 'config-lingui';
import { page } from '$app/state';

export type Language = (typeof locales)[number];

export type Key =
	// keys for play
	| 'sessionID'
	| 'rgs_url'
	| 'lang'
	| 'currency'
	| 'device'
	| 'social'
	| 'demo'
	// keys for replay 
	| 'replay'
	| 'amount'
	| 'game'
	| 'mode'
	| 'version'
	| 'event'
	;

const SUPPORTED_LOCALES = new Set<string>(locales);

const getUrlSearchParam = (key: Key) => page.url.searchParams.get(key) as string;

/** Stake US/EU social coin codes — display as GC / SC (never `$`). */
const SOCIAL_CURRENCY_CODES = new Set(['XGC', 'XSC', 'XEC']);

type ResolveLanguageOptions = {
	/** Social mode only supports English — any other/invalid lang falls back to `en`. */
	social?: boolean;
};

/**
 * Resolve operator-provided `?lang=` to a supported locale.
 * Unsupported values fall back to English. In social mode, always English.
 */
export const resolveLanguage = (
	raw: string | null | undefined,
	options?: ResolveLanguageOptions,
): Language => {
	if (options?.social) return 'en';
	if (!raw) return 'en';
	const normalized = raw.trim().toLowerCase();
	if (normalized === 'br') return 'pt';
	if (SUPPORTED_LOCALES.has(normalized)) return normalized as Language;
	return 'en';
};

/** Operator `?currency=` (e.g. XGC / XSC / XEC / USD). */
const currency = () => {
	const raw = getUrlSearchParam('currency');
	return raw ? raw.trim().toUpperCase() : '';
};

/**
 * Stake.us social casino UI: explicit `?social=true` or social coin currencies.
 * Also forces English via `lang()`.
 */
const social = () =>
	getUrlSearchParam('social') === 'true' || SOCIAL_CURRENCY_CODES.has(currency());

const lang = () => resolveLanguage(getUrlSearchParam('lang'), { social: social() });
const sessionID = () => getUrlSearchParam('sessionID') || '';
const rgsUrl = () => getUrlSearchParam('rgs_url') || '';

// params for replay
const replay = () => getUrlSearchParam('replay') === 'true';
/** Replay bet amount in API micro-units (1_000_000 = 1.00). */
const amount = () => Number(getUrlSearchParam('amount')) || 0;
const game = () => getUrlSearchParam('game') || '';
const version = () => getUrlSearchParam('version') || '';
const mode = () => getUrlSearchParam('mode') || '';
const event = () => getUrlSearchParam('event') || '';

export const stateUrlDerived = {
	// states for play
	lang,
	sessionID,
	rgsUrl,
	social,
	currency,
	// states for replay
	replay,
	amount,
	game,
	mode,
	version,
	event,
};

export const isSocialCurrencyCode = (code: string) =>
	SOCIAL_CURRENCY_CODES.has(String(code ?? '').trim().toUpperCase());
