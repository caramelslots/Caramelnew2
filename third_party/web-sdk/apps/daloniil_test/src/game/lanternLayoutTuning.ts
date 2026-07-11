import {
	getPortraitDeviceWidth,
	getPortraitMobileTier,
	type PortraitCanvasSizeType,
} from './constants';

/** Доли canvas (0–1). leftRatio/rightRatio — горизонталь якоря фонаря. */
export type LanternLayoutTuning = {
	/** Горизонталь левого фонаря (доля ширины canvas). Больше → правее. */
	leftRatio: number;
	/** Горизонталь правого фонаря (доля ширины canvas). Меньше → левее. */
	rightRatio: number;
	/** Высота фонаря как доля высоты canvas. */
	heightRatio: number;
	/** Вертикаль якоря (0 = верх canvas, отрицательное — выше края). */
	topRatio: number;
};

/** Базовые значения для всех layout (телефоны используют их без переопределения). */
export const LANTERN_LAYOUT_DEFAULTS: LanternLayoutTuning = {
	heightRatio: 0.42,
	topRatio: -0.04,
	leftRatio: 0.17,
	rightRatio: 0.86,
};

/**
 * Подгонка `lantern_day.webp` / `lantern_night.webp` по типу устройства.
 *
 * Ключи layout:
 *   desktop, tablet, landscape — ПК / планшет / горизонтальный режим
 *   portrait-large, portrait-medium, portrait-small — телефоны (Mobile L/M/S)
 *
 * leftRatio ↑ → левый фонарь правее
 * rightRatio ↓ → правый фонарь левее
 */
export const LANTERN_LAYOUT_BY_LAYOUT: Record<string, Partial<LanternLayoutTuning>> = {
	desktop: { leftRatio: 0.21, rightRatio: 0.82 },
	tablet: { leftRatio: 0.21, rightRatio: 0.82 },
	landscape: { leftRatio: 0.21, rightRatio: 0.82 },

	'portrait-large': {},
	'portrait-medium': {},
	'portrait-small': {},
};

export const getLanternLayoutKey = (
	layoutType: string,
	canvasSizeType: PortraitCanvasSizeType,
	canvasSizes: { width: number; height: number },
) => {
	if (layoutType === 'portrait') {
		return `portrait-${getPortraitMobileTier(canvasSizeType, getPortraitDeviceWidth(canvasSizes))}`;
	}
	return layoutType;
};

export const resolveLanternLayout = (layoutKey: string): LanternLayoutTuning => {
	const overrides = LANTERN_LAYOUT_BY_LAYOUT[layoutKey] ?? {};
	return { ...LANTERN_LAYOUT_DEFAULTS, ...overrides };
};
