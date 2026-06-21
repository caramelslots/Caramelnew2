import type { createLayout } from 'utils-layout';

import { isPopoutViewport } from './constants';

export const LOADER_CARD_ASPECT = 862 / 1484;
export const LOADER_CARD_COUNT = 3;

type LayoutDerived = ReturnType<typeof createLayout>['stateLayoutDerived'];

export const shouldUseLoaderCarousel = (layoutDerived: LayoutDerived) => {
	const canvasSizes = layoutDerived.canvasSizes();
	if (isPopoutViewport(canvasSizes)) return false;

	const sizeType = layoutDerived.canvasSizeType();
	return sizeType === 'mobile' || sizeType === 'smallMobile';
};

/** Canvas px anchor for the loader cards row (matches LoadingScreen MainContainer center + Y offset). */
export const computeLoaderCardsAnchor = (layoutDerived: LayoutDerived) => {
	const ml = layoutDerived.mainLayout();
	const cardYOffset = -ml.height * 0.04;
	const localX = ml.width * 0.5;
	const localY = ml.height * 0.5 + cardYOffset;

	return {
		x: ml.x + (localX - ml.width / 2) * ml.scale,
		y: ml.y + (localY - ml.height / 2) * ml.scale,
		scale: ml.scale,
		layoutWidth: ml.width,
		layoutHeight: ml.height,
	};
};

export const computeLoaderRowMetrics = (layoutWidth: number, scale: number) => {
	const cardWidthLayout = layoutWidth * 0.24;
	const cardHeightLayout = cardWidthLayout / LOADER_CARD_ASPECT;
	const gapLayout = layoutWidth * 0.015;

	return {
		cardWidth: cardWidthLayout * scale,
		cardHeight: cardHeightLayout * scale,
		gap: gapLayout * scale,
		rowWidth: (LOADER_CARD_COUNT * cardWidthLayout + (LOADER_CARD_COUNT - 1) * gapLayout) * scale,
	};
};

export const computeLoaderCarouselMetrics = (
	layoutWidth: number,
	scale: number,
	canvasWidth: number,
	canvasHeight: number,
) => {
	const isPortraitCanvas = canvasHeight > canvasWidth;

	// Fit the largest card that stays inside the phone screen.
	const maxCardWidthPx = canvasWidth * 0.94;
	const maxCardHeightPx = canvasHeight * 0.62;

	let cardWidthPx = Math.min(layoutWidth * (isPortraitCanvas ? 0.72 : 0.58) * scale, maxCardWidthPx);
	let cardHeightPx = cardWidthPx / LOADER_CARD_ASPECT;

	if (cardHeightPx > maxCardHeightPx) {
		cardHeightPx = maxCardHeightPx;
		cardWidthPx = cardHeightPx * LOADER_CARD_ASPECT;
	}

	return {
		cardWidth: cardWidthPx,
		cardHeight: cardHeightPx,
		/** One full screen per slide — cards enter/exit from off-screen edges. */
		slideStep: canvasWidth,
		slideWidth: canvasWidth,
		viewportWidth: canvasWidth,
	};
};
