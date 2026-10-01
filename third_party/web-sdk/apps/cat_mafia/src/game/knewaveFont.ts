import { FONT_KNEWAVE } from './constants';

/** Resolve static/ asset URL relative to the deployed page (Stake Engine subpath-safe). */
export const knewaveFontUrl = (path = 'assets/fonts/knewave/Knewave-Regular.ttf') =>
	new URL(path.replace(/^\//, ''), typeof window !== 'undefined' ? window.location.href : import.meta.url)
		.href;

const KNEWAVE_REGULAR_URL = knewaveFontUrl();

let loadPromise: Promise<void> | null = null;
let fontFaceInjected = false;

const injectKnewaveFontFace = () => {
	if (typeof document === 'undefined' || fontFaceInjected) return;
	fontFaceInjected = true;

	const style = document.createElement('style');
	style.id = 'knewave-font-face';
	style.textContent = `
		@font-face {
			font-family: '${FONT_KNEWAVE}';
			src: url('${KNEWAVE_REGULAR_URL}') format('truetype');
			font-weight: 400;
			font-style: normal;
			font-display: block;
		}
	`;
	document.head.appendChild(style);

	const preload = document.createElement('link');
	preload.rel = 'preload';
	preload.as = 'font';
	preload.type = 'font/ttf';
	preload.href = KNEWAVE_REGULAR_URL;
	preload.crossOrigin = 'anonymous';
	document.head.appendChild(preload);
};

const isKnewaveAvailable = () =>
	typeof document !== 'undefined' &&
	document.fonts.check(`400 16px "${FONT_KNEWAVE}"`);

/** Load Knewave for buy-bonus card labels (Latin script + digit "10"). */
export const ensureKnewaveFontLoaded = (): Promise<void> => {
	if (typeof document === 'undefined') return Promise.resolve();
	injectKnewaveFontFace();
	if (isKnewaveAvailable()) return Promise.resolve();

	if (!loadPromise) {
		loadPromise = (async () => {
			const face = await new FontFace(FONT_KNEWAVE, `url(${KNEWAVE_REGULAR_URL})`, {
				weight: '400',
				style: 'normal',
			}).load();
			document.fonts.add(face);
			await document.fonts.load(`400 16px "${FONT_KNEWAVE}"`);
			if (!isKnewaveAvailable()) {
				throw new Error('Knewave font failed to register');
			}
		})().catch((error) => {
			loadPromise = null;
			console.error('Failed to load Knewave font', error);
			throw error;
		});
	}

	return loadPromise;
};

if (typeof document !== 'undefined') {
	void ensureKnewaveFontLoaded();
}
