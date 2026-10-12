import { LOCALE_TEXT_FILL_GOLD } from './constants';

/** Prostoi / bablo gold bitmap reference (no Arabic atlas). RGB 244 184 64. */
export const ARABIC_PROSTOI_GOLD_FILL = 0xf4b840;
export const ARABIC_PROSTOI_GOLD_STROKE = 0x3d2305;

/** Prostoi white bitmap reference — cream midpoint of the atlas gradient. */
export const ARABIC_PROSTOI_WHITE_FILL = 0xf5e6cc;
export const ARABIC_PROSTOI_WHITE_STROKE = 0x3d2305;

type TextStyleLike = {
	fontSize?: number;
	fill?: string | number;
	stroke?: { color?: string | number; width?: number; join?: string };
	[key: string]: unknown;
};

const normalizeFill = (fill: string | number | undefined): string => {
	if (fill == null) return '';
	if (typeof fill === 'number') return `#${fill.toString(16).padStart(6, '0')}`;
	return fill.toLowerCase();
};

/** Gold prostoi / bablo vs white prostoi — driven by the caller's fallbackFill. */
export const isGoldLocaleFill = (fill: string | number | undefined): boolean => {
	const normalized = normalizeFill(fill);
	return (
		normalized === LOCALE_TEXT_FILL_GOLD.toLowerCase() ||
		normalized === '#ffcc44' ||
		normalized === '#ffc044' ||
		normalized === '#ff9900' ||
		normalized === '#ffa500' ||
		normalized === '#f4b840'
	);
};

/** Outline thickness matched to prostoi_langs atlas padding (~7.5% of font size). */
export const arabicStrokeWidth = (fontSize: number): number =>
	Math.max(2, Math.round(fontSize * 0.075));

/**
 * PIXI Text style that approximates prostoi bitmap when Arabic has no atlas.
 * Used by LocaleGlyph for HUD labels such as WIN under the board.
 */
export const arabicLocaleTextStyle = <T extends TextStyleLike>(
	baseStyle: T,
	fallbackFill?: string | number,
): T => {
	const fontSize = Number(baseStyle.fontSize) || 24;
	const strokeWidth = arabicStrokeWidth(fontSize);
	const fillHint = fallbackFill ?? baseStyle.fill;
	const isGold = isGoldLocaleFill(fillHint);

	if (isGold) {
		return {
			...baseStyle,
			fill: ARABIC_PROSTOI_GOLD_FILL,
			stroke: { color: ARABIC_PROSTOI_GOLD_STROKE, width: strokeWidth, join: 'round' },
		};
	}

	return {
		...baseStyle,
		fill: ARABIC_PROSTOI_WHITE_FILL,
		stroke: { color: ARABIC_PROSTOI_WHITE_STROKE, width: strokeWidth, join: 'round' },
	};
};
