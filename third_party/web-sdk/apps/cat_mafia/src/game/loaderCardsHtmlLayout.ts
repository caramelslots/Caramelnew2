import type { createLayout } from 'utils-layout';

import { isPopoutViewport } from './constants';
import { LOADER_NEON_LOGO_ASPECT } from './loaderCardAssets';

export const LOADER_CARD_ASPECT = 862 / 1484;
export const LOADER_CARD_COUNT = 3;
/** Uniform scale for info cards (desktop row + mobile carousel). */
const LOADER_CARD_SCALE = 0.92;

/** Canvas-relative composition — desktop row. */
const LOADER_CARD_CENTER_Y_RATIO = 0.545;
/** Mobile carousel — card row center (logo lifted separately). */
const LOADER_CARD_CENTER_Y_RATIO_CAROUSEL = 0.538;
const LOADER_LOGO_WIDTH_RATIO = 0.68;
const LOADER_LOGO_WIDTH_RATIO_CAROUSEL = 0.82;
const LOADER_LOGO_MAX_HEIGHT_RATIO = 0.17;
const LOADER_LOGO_GAP_RATIO = 0.012;
/** Extra logo lift on mobile (negative = up), cards stay anchored. */
const LOADER_LOGO_LIFT_CAROUSEL_RATIO = -0.036;

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
	const cardYOffset = -ml.height * 0.05;
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

	const cardScale = scale * LOADER_CARD_SCALE;

	return {
		cardWidth: cardWidthLayout * cardScale,
		cardHeight: cardHeightLayout * cardScale,
		gap: gapLayout * cardScale,
		rowWidth:
			(LOADER_CARD_COUNT * cardWidthLayout + (LOADER_CARD_COUNT - 1) * gapLayout) * cardScale,
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
		cardWidth: cardWidthPx * LOADER_CARD_SCALE,
		cardHeight: cardHeightPx * LOADER_CARD_SCALE,
		/** One full screen per slide — cards enter/exit from off-screen edges. */
		slideStep: canvasWidth,
		slideWidth: canvasWidth,
		viewportWidth: canvasWidth,
	};
};

/** Slightly smaller than full slot — MEOWFIA art reads large at 1:1. */
const LOADER_LOGO_SCALE = 0.88;

/** Minimum clearance from canvas top for the logo (fraction of canvas height). */
const LOADER_STACK_TOP_PADDING_RATIO = 0.04;

/** Fixed canvas anchor for the card row (logo sits in the stack above via margin). */
export const computeLoaderScreenPosition = (
	layoutDerived: LayoutDerived,
	cardHeightPx: number,
	logo: { height: number; gap: number; lift?: number },
) => {
	const { width, height } = layoutDerived.canvasSizes();
	const useCarousel = shouldUseLoaderCarousel(layoutDerived);
	const stackHeight = logo.height + logo.gap + cardHeightPx;
	const centerYRatio = useCarousel ? LOADER_CARD_CENTER_Y_RATIO_CAROUSEL : LOADER_CARD_CENTER_Y_RATIO;
	let centerY = height * centerYRatio;
	const lift = logo.lift ?? 0;

	const stackTop = centerY - stackHeight / 2 + lift;
	const minTop = height * LOADER_STACK_TOP_PADDING_RATIO;
	if (stackTop < minTop) {
		centerY = minTop + stackHeight / 2;
	}

	return {
		centerX: width * 0.5,
		centerY,
	};
};

/** Loader title — centered above the info cards. */
export const computeLoaderLogoMetrics = (layoutDerived: LayoutDerived) => {
	const { width: canvasWidth, height: canvasHeight } = layoutDerived.canvasSizes();
	const useCarousel = shouldUseLoaderCarousel(layoutDerived);

	const widthRatio = useCarousel ? LOADER_LOGO_WIDTH_RATIO_CAROUSEL : LOADER_LOGO_WIDTH_RATIO;
	let width = canvasWidth * widthRatio * LOADER_LOGO_SCALE;
	let height = width / LOADER_NEON_LOGO_ASPECT;
	const maxHeight = canvasHeight * LOADER_LOGO_MAX_HEIGHT_RATIO;

	if (height > maxHeight) {
		height = maxHeight;
		width = height * LOADER_NEON_LOGO_ASPECT;
	}

	return {
		width,
		height,
		/** Space between logo bottom edge and card top edge. */
		gap: canvasHeight * LOADER_LOGO_GAP_RATIO,
		lift: useCarousel ? canvasHeight * LOADER_LOGO_LIFT_CAROUSEL_RATIO : 0,
	};
};
