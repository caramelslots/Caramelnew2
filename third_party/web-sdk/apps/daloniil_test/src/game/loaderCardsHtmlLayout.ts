import type { createLayout } from 'utils-layout';

import { isPopoutSmallViewport, isPopoutViewport } from './constants';
import { LOADER_NEON_LOGO_ASPECT } from './loaderCardAssets';

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
	const cardYOffset = -ml.height * 0.1;
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

	let cardWidthPx = Math.min(
		layoutWidth * (isPortraitCanvas ? 0.72 : 0.58) * scale,
		maxCardWidthPx,
	);
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

/** Neon WOK FURY title — centered above the loader cards (ref. CASH STACKS on info screen). */
export const computeLoaderLogoMetrics = (layoutDerived: LayoutDerived) => {
	const canvasSizes = layoutDerived.canvasSizes();
	const canvasWidth = canvasSizes.width;
	const canvasHeight = canvasSizes.height;
	const useCarousel = shouldUseLoaderCarousel(layoutDerived);
	const isPopout = isPopoutViewport(canvasSizes);
	const isPopoutL = isPopout && !isPopoutSmallViewport(canvasSizes);
	const maxWidthFraction = useCarousel ? 1 : isPopout ? 0.78 : 0.85;
	let width = Math.min(canvasWidth * maxWidthFraction, canvasWidth - 16);
	let height = width / LOADER_NEON_LOGO_ASPECT;

	// Keep the title in the upper band above cards (never clip off the top of the canvas).
	const maxHeight = canvasHeight * (useCarousel ? 0.26 : 0.24);
	if (height > maxHeight) {
		height = maxHeight;
		width = height * LOADER_NEON_LOGO_ASPECT;
	}

	const dropOffset = useCarousel ? 8 : isPopoutL ? 30 : isPopout ? 18 : 44;

	return {
		width,
		height,
		/** Space between logo bottom edge and card top edge. */
		gap: useCarousel ? 8 : 12,
		/** Extra downward shift for the logo (cards stay fixed). */
		dropOffset,
	};
};
