import { ensureArabicFontLoaded } from './arabicFont';
import { isArabicLocale, supportsBitmapFont } from './constants';

/** True when locale needs a custom TTF loaded before PIXI/HTML text renders. */
export const needsLocaleFontLoad = (locale: string): boolean =>
	!supportsBitmapFont(locale) && isArabicLocale(locale);

export const ensureLocaleFontsLoaded = (locale: string): Promise<void> =>
	isArabicLocale(locale) ? ensureArabicFontLoaded() : Promise.resolve();

export const preloadLocaleFontsIfNeeded = (locale: string): Promise<void> =>
	needsLocaleFontLoad(locale) ? ensureLocaleFontsLoaded(locale) : Promise.resolve();
