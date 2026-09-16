import type { createLayout } from 'utils-layout';

import { isPopoutSmallViewport, POPOUT_S_SCALE } from './constants';
import { portraitRefToCanvasLength } from './portraitHudLayout';

type LayoutDerived = ReturnType<typeof createLayout>['stateLayoutDerived'];

/** Design tokens — bumped above legacy Pixi UiGameName (REM×1.5 @ 1080p). */
const BASE = {
	left: 24,
	fontSize: 36,
	lineHeight: 48,
	gap: 8,
} as const;

const REF_CANVAS_H = 1080;

const clampScale = (scale: number) => Math.min(1, Math.max(0.55, scale));

const resolveScale = (layoutDerived: LayoutDerived) => {
	const canvas = layoutDerived.canvasSizes();

	if (isPopoutSmallViewport(canvas)) {
		return POPOUT_S_SCALE;
	}

	return clampScale(canvas.height / REF_CANVAS_H);
};

const toCanvas = (layoutPx: number, layoutDerived: LayoutDerived, scale: number) => {
	if (layoutDerived.layoutType() === 'portrait') {
		return portraitRefToCanvasLength(layoutPx, layoutDerived);
	}
	return layoutPx * scale;
};

export const computeGameNameHtmlLayout = (layoutDerived: LayoutDerived) => {
	const scale = resolveScale(layoutDerived);

	return {
		left: toCanvas(BASE.left, layoutDerived, scale),
		top: 0,
		fontSize: toCanvas(BASE.fontSize, layoutDerived, scale),
		lineHeight: toCanvas(BASE.lineHeight, layoutDerived, scale),
		gap: toCanvas(BASE.gap, layoutDerived, scale),
	};
};
