import { FONT_CJK, isCjkLocale } from './constants';

/** Resolve static/ asset URL relative to the deployed page (Stake Engine subpath-safe). */
const assetUrl = (path: string) =>
	new URL(path.replace(/^\//, ''), typeof window !== 'undefined' ? window.location.href : import.meta.url)
		.href;

const CJK_FONT_URL = assetUrl('assets/fonts/cjkFont/NotoSansMonoCJKhk-Bold.otf');

let loadPromise: Promise<void> | null = null;

/** Load NotoSansMonoCJKhk-Bold for ja / ko / zh (HTML + PIXI Text). */
export const ensureCjkFontLoaded = (): Promise<void> => {
	if (typeof document === 'undefined') return Promise.resolve();
	if (document.fonts.check(`700 16px "${FONT_CJK}"`)) return Promise.resolve();

	if (!loadPromise) {
		loadPromise = (async () => {
			const face = new FontFace(FONT_CJK, `url(${CJK_FONT_URL})`, {
				weight: '700',
				style: 'normal',
			});
			const loaded = await face.load();
			document.fonts.add(loaded);
		})().catch((error) => {
			loadPromise = null;
			console.error('Failed to load CJK font', error);
			throw error;
		});
	}

	return loadPromise;
};

export const preloadCjkFontIfNeeded = (locale: string) => {
	if (isCjkLocale(locale)) return ensureCjkFontLoaded();
	return Promise.resolve();
};
