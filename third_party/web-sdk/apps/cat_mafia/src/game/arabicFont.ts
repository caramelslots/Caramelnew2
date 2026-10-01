import { FONT_ARABIC_KRUTOI, FONT_ARABIC_PROSTOI } from './constants';

/** Resolve static/ asset URL relative to the deployed page (Stake Engine subpath-safe). */
const assetUrl = (path: string) =>
	new URL(path.replace(/^\//, ''), typeof window !== 'undefined' ? window.location.href : import.meta.url)
		.href;

const CAIRO_BLACK_URL = assetUrl('assets/fonts/arabicFont/Cairo-Black.ttf');
const CAIRO_MEDIUM_URL = assetUrl('assets/fonts/arabicFont/Cairo-Medium.ttf');

let loadPromise: Promise<void> | null = null;

/** Load Cairo Black + Medium for ar (HTML + PIXI Text). */
export const ensureArabicFontLoaded = (): Promise<void> => {
	if (typeof document === 'undefined') return Promise.resolve();
	if (
		document.fonts.check(`900 16px "${FONT_ARABIC_KRUTOI}"`) &&
		document.fonts.check(`500 16px "${FONT_ARABIC_PROSTOI}"`)
	) {
		return Promise.resolve();
	}

	if (!loadPromise) {
		loadPromise = (async () => {
			const [black, medium] = await Promise.all([
				new FontFace(FONT_ARABIC_KRUTOI, `url(${CAIRO_BLACK_URL})`, {
					weight: '900',
					style: 'normal',
				}).load(),
				new FontFace(FONT_ARABIC_PROSTOI, `url(${CAIRO_MEDIUM_URL})`, {
					weight: '500',
					style: 'normal',
				}).load(),
			]);
			document.fonts.add(black);
			document.fonts.add(medium);
		})().catch((error) => {
			loadPromise = null;
			console.error('Failed to load Arabic fonts', error);
			throw error;
		});
	}

	return loadPromise;
};
