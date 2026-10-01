import { locales } from 'config-lingui';
import type { Language } from 'state-shared';

/** Stake-supported locale codes (config-lingui). */
export const STAKE_LOCALES = locales;

/**
 * Locales Stake does not support — used in Dev LANG menu to verify
 * invalid `?lang=` falls back to English (no raw i18n keys in Game Info).
 */
export const INVALID_TEST_LOCALES = ['uk'] as const;

export type DevLanguage = Language | (typeof INVALID_TEST_LOCALES)[number];

export const LANG_LABELS: Record<Language, string> = {
	ar: 'AR',
	de: 'DE',
	en: 'EN',
	es: 'ES',
	fi: 'FI',
	fr: 'FR',
	hi: 'HI',
	id: 'ID',
	ja: 'JA',
	ko: 'KO',
	pl: 'PL',
	pt: 'PT',
	ru: 'RU',
	tr: 'TR',
	vi: 'VI',
	zh: 'ZH',
};

export const INVALID_LANG_LABELS: Record<(typeof INVALID_TEST_LOCALES)[number], string> = {
	uk: 'UK ✕',
};

const INVALID_TEST_LOCALE_SET = new Set<string>(INVALID_TEST_LOCALES);

export const isInvalidTestLang = (lang: string) => INVALID_TEST_LOCALE_SET.has(lang);

/** Raw `?lang=` from the URL (before resolveLanguage fallback). */
export const getRawUrlLang = () =>
	new URL(window.location.href).searchParams.get('lang')?.trim().toLowerCase() ?? '';

/** Dev-only: switch slot locale via ?lang= and reload so LoadI18n + URL-derived text pick it up. */
export const setGameLanguage = (lang: DevLanguage) => {
	const url = new URL(window.location.href);
	url.searchParams.set('lang', lang);
	window.location.assign(url.toString());
};
