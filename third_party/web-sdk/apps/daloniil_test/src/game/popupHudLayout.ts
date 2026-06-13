import type { createLayout } from 'utils-layout';

import { isPopoutSmallViewport } from './constants';
import {
	computeDesktopHudLayout,
	resolveDesktopHudConfig,
} from './desktopHudLayout';
import { computePortraitHudCanvas } from './portraitHudLayout';

type LayoutDerived = ReturnType<typeof createLayout>['stateLayoutDerived'];

/** Design reference at 1280×720 — popups stay compact, only shrink on narrow viewports. */
const DESIGN_CANVAS_WIDTH = 1280;
const AUTOPLAY_REF_WIDTH = 132;
const MENU_REF_WIDTH = 126;
const GAP_ABOVE_BUTTON = 5;
const SCREEN_MARGIN = 12;
const MIN_POPUP_WIDTH = 108;

export type PopupHudLayout = {
	scale: number;
	autoplay: {
		width: number;
		left: number;
		bottom: number;
		padding: number;
		gap: number;
		titleSize: number;
		sectionTitleSize: number;
		roundsSize: number;
		startFontSize: number;
		startPaddingY: number;
		sliderTrackHeight: number;
		sliderPadY: number;
		sliderPadX: number;
		borderRadius: number;
		featureNameSize: number;
		featureCostSize: number;
		featureRowPadY: number;
		featureRowPadX: number;
		toggleW: number;
		toggleH: number;
		knobSize: number;
	};
	menu: {
		width: number;
		left: number;
		bottom: number;
		padding: number;
		gap: number;
		titleSize: number;
		iconSize: number;
		rowGap: number;
		segMinHeight: number;
		segBtnHeight: number;
		segBtnFontSize: number;
		segControlPadding: number;
		volumeTrackHeight: number;
		volumePadX: number;
		borderRadius: number;
	};
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const viewportFactor = (canvasWidth: number) => clamp(canvasWidth / DESIGN_CANVAS_WIDTH, 0.78, 1);

const resolveAutoplayWidth = (canvasWidth: number, layoutType: string) => {
	const maxFraction = layoutType === 'portrait' ? 0.56 : 0.14;
	return clamp(
		AUTOPLAY_REF_WIDTH * viewportFactor(canvasWidth),
		MIN_POPUP_WIDTH,
		Math.min(AUTOPLAY_REF_WIDTH, canvasWidth * maxFraction),
	);
};

const resolveMenuWidth = (canvasWidth: number, layoutType: string) => {
	const maxFraction = layoutType === 'portrait' ? 0.6 : 0.16;
	return clamp(
		MENU_REF_WIDTH * viewportFactor(canvasWidth),
		MIN_POPUP_WIDTH,
		Math.min(MENU_REF_WIDTH, canvasWidth * maxFraction),
	);
};

const fitPopupLeft = (
	anchorCenterX: number,
	width: number,
	canvasWidth: number,
	align: 'prefer-left' | 'prefer-right',
) => {
	const maxWidth = canvasWidth - SCREEN_MARGIN * 2;
	const fittedWidth = clamp(width, Math.min(MIN_POPUP_WIDTH, maxWidth), maxWidth);

	let left = anchorCenterX - fittedWidth / 2;
	if (align === 'prefer-right') {
		left = Math.min(left, canvasWidth - SCREEN_MARGIN - fittedWidth);
	} else {
		left = Math.max(left, SCREEN_MARGIN);
	}
	left = clamp(left, SCREEN_MARGIN, canvasWidth - SCREEN_MARGIN - fittedWidth);

	return { left, width: fittedWidth };
};

const buildAutoplayMetrics = (width: number) => {
	const s = width / AUTOPLAY_REF_WIDTH;

	return {
		scale: s,
		width,
		padding: 7 * s,
		gap: 4 * s,
		titleSize: 11 * s,
		sectionTitleSize: 9 * s,
		roundsSize: 12 * s,
		startFontSize: 8 * s,
		startPaddingY: 5 * s,
		sliderTrackHeight: 5 * s,
		sliderPadY: 3 * s,
		sliderPadX: 5 * s,
		borderRadius: 7 * s,
		featureNameSize: 9 * s,
		featureCostSize: 7 * s,
		featureRowPadY: 4 * s,
		featureRowPadX: 5 * s,
		toggleW: 24 * s,
		toggleH: 13 * s,
		knobSize: 9 * s,
	};
};

const buildMenuMetrics = (width: number) => {
	const s = width / MENU_REF_WIDTH;

	return {
		width,
		padding: 7 * s,
		gap: 4 * s,
		titleSize: 10 * s,
		iconSize: 18 * s,
		rowGap: 4 * s,
		segMinHeight: 20 * s,
		segBtnHeight: 17 * s,
		segBtnFontSize: 9 * s,
		segControlPadding: 2 * s,
		volumeTrackHeight: 7 * s,
		volumePadX: 5 * s,
		borderRadius: 8 * s,
	};
};

export const computePopupHudLayout = (layoutDerived: LayoutDerived): PopupHudLayout => {
	const canvas = layoutDerived.canvasSizes();
	const layoutType = layoutDerived.layoutType();
	const gap = GAP_ABOVE_BUTTON;

	if (layoutType === 'portrait') {
		const hud = computePortraitHudCanvas(layoutDerived);
		const iconSize = hud.util.iconSize;
		const autoplayWidth = resolveAutoplayWidth(canvas.width, layoutType);
		const menuWidth = resolveMenuWidth(canvas.width, layoutType);
		const autoplayFit = fitPopupLeft(hud.util.x.autoplay, autoplayWidth, canvas.width, 'prefer-right');
		const menuFit = fitPopupLeft(hud.util.x.menu, menuWidth, canvas.width, 'prefer-left');

		return {
			scale: autoplayWidth / AUTOPLAY_REF_WIDTH,
			autoplay: {
				...buildAutoplayMetrics(autoplayFit.width),
				left: autoplayFit.left,
				bottom: canvas.height - hud.util.centerY + iconSize / 2 + gap,
			},
			menu: {
				...buildMenuMetrics(menuFit.width),
				left: menuFit.left + menuFit.width / 2,
				bottom: canvas.height - hud.util.centerY + iconSize / 2 + gap,
			},
		};
	}

	const isPopoutSmall = isPopoutSmallViewport(canvas);
	const hud = computeDesktopHudLayout(layoutDerived, resolveDesktopHudConfig(isPopoutSmall));
	const autoplayWidth = resolveAutoplayWidth(canvas.width, layoutType);
	const menuWidth = resolveMenuWidth(canvas.width, layoutType);
	const autoplayFit = fitPopupLeft(hud.autoplay.x, autoplayWidth, canvas.width, 'prefer-right');
	const menuFit = fitPopupLeft(hud.menu.x, menuWidth, canvas.width, 'prefer-left');

	return {
		scale: autoplayWidth / AUTOPLAY_REF_WIDTH,
		autoplay: {
			...buildAutoplayMetrics(autoplayFit.width),
			left: autoplayFit.left,
			bottom: canvas.height - hud.autoplay.y + hud.autoplay.height / 2 + gap,
		},
		menu: {
			...buildMenuMetrics(menuFit.width),
			left: menuFit.left + menuFit.width / 2,
			bottom: canvas.height - hud.menu.y + hud.menu.size / 2 + gap,
		},
	};
};
