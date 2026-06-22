import { locales } from 'config-lingui';
import type { Language } from 'state-shared';

/** Stake-supported locale codes (config-lingui). */
export const STAKE_LOCALES = locales;

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

/** Dev-only: switch slot locale via ?lang= and reload so LoadI18n + URL-derived text pick it up. */
export const setGameLanguage = (lang: Language) => {
	const url = new URL(window.location.href);
	url.searchParams.set('lang', lang);
	window.location.assign(url.toString());
};
