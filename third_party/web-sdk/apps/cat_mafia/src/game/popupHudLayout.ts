import type { createLayout } from 'utils-layout';

import { isPopoutSmallViewport, isPopoutViewport } from './constants';
import { computeDesktopHudLayout, resolveDesktopHudConfig } from './desktopHudLayout';
import { computePortraitHudCanvas } from './portraitHudLayout';

type LayoutDerived = ReturnType<typeof createLayout>['stateLayoutDerived'];

/** Design reference at 1280×720 — popups stay compact, only shrink on narrow viewports. */
const DESIGN_CANVAS_WIDTH = 1280;
const AUTOPLAY_REF_WIDTH = 132;
const MENU_REF_WIDTH = 320;
const GAP_ABOVE_BUTTON = 5;
const MENU_PANEL_DROP = 98;
const MENU_PANEL_DROP_POPOUT_S_FACTOR = 1.1;
const MENU_PANEL_SHIFT_LEFT = 0;
/** Extra left offset on portrait — fraction of panel width, applied after anchor alignment.
 *  Smaller = правее. */
const MENU_PANEL_SHIFT_LEFT_PORTRAIT = 0.1;
/** Matches `.menu-panel` transform-origin X (12%) — hinge above menu button. */
const MENU_PANEL_ANCHOR_X_FRACTION = 0.12;
const MENU_PANEL_LIFT = 0.045;
/** Portrait phone: raise settings menu (fraction of panel width). */
const MENU_PANEL_LIFT_PORTRAIT = 0.3;
/** Extra upward lift for desktop/landscape settings menu (fraction of panel width). */
const MENU_PANEL_LIFT_DESKTOP = 0.3;
const MENU_PANEL_POPOUT_S_EXTRA_LIFT = 0;
/** Negative = left of autoplay HUD button; closer to 0 / positive = правее. Desktop only (portrait uses centered modal). */
const AUTOPLAY_PANEL_SHIFT_LEFT = -0.08;
const AUTOPLAY_PANEL_LIFT = 0.045;
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

const resolveMenuPanelWidth = (
	canvasWidth: number,
	layoutType: string,
	isPopoutSmall: boolean,
	isPopout: boolean,
) => {
	if (layoutType === 'portrait') {
		return Math.min(MENU_REF_WIDTH, canvasWidth * 0.94);
	}
	if (isPopoutSmall) return Math.min(160, canvasWidth * 0.68);
	if (isPopout) return Math.min(245, canvasWidth * 0.58);
	return Math.min(MENU_REF_WIDTH, canvasWidth * 0.25);
};

export const resolveMenuPanelWidthForLayout = (layoutDerived: LayoutDerived) => {
	const canvas = layoutDerived.canvasSizes();
	const layoutType = layoutDerived.layoutType();
	const isPopoutSmall = isPopoutSmallViewport(canvas);
	const isPopout = isPopoutViewport(canvas) && !isPopoutSmall;
	return resolveMenuPanelWidth(canvas.width, layoutType, isPopoutSmall, isPopout);
};

const resolveMenuWidth = (
	canvasWidth: number,
	layoutType: string,
	isPopoutSmall: boolean,
	isPopout: boolean,
) => resolveMenuPanelWidth(canvasWidth, layoutType, isPopoutSmall, isPopout);

const resolveMenuPanelDrop = (panelWidth: number, isPopoutSmall: boolean) => {
	const scaledDrop = MENU_PANEL_DROP * (panelWidth / MENU_REF_WIDTH);
	if (isPopoutSmall) return scaledDrop * MENU_PANEL_DROP_POPOUT_S_FACTOR;
	return scaledDrop;
};

const resolveMenuPanelExtraLift = (panelWidth: number, isPopoutSmall: boolean) =>
	isPopoutSmall ? panelWidth * MENU_PANEL_POPOUT_S_EXTRA_LIFT : 0;

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

export type AutoplayPanelAnchor = {
	left: number;
	bottom: number;
	width: number;
};

const resolveAutoplayPanelWidth = (
	canvasWidth: number,
	isPopoutSmall: boolean,
	isPopout: boolean,
) => {
	if (isPopoutSmall) return Math.min(155, canvasWidth * 0.68);
	if (isPopout) return Math.min(240, canvasWidth * 0.58);
	return Math.min(315, canvasWidth * 0.245);
};

/** Anchor for the full bg_auto panel — null on portrait phone (centered modal). */
export const computeAutoplayPanelAnchor = (
	layoutDerived: LayoutDerived,
): AutoplayPanelAnchor | null => {
	const canvas = layoutDerived.canvasSizes();
	const layoutType = layoutDerived.layoutType();

	if (layoutType === 'portrait') return null;

	const isPopoutSmall = isPopoutSmallViewport(canvas);
	const isPopout = isPopoutViewport(canvas) && !isPopoutSmall;
	const panelWidth = resolveAutoplayPanelWidth(canvas.width, isPopoutSmall, isPopout);
	const hud = computeDesktopHudLayout(layoutDerived, resolveDesktopHudConfig(isPopoutSmall));
	const autoplayFit = fitPopupLeft(hud.autoplay.x, panelWidth, canvas.width, 'prefer-right');

	return {
		left: autoplayFit.left + autoplayFit.width * AUTOPLAY_PANEL_SHIFT_LEFT,
		bottom:
			canvas.height -
			hud.autoplay.y +
			hud.autoplay.height / 2 +
			GAP_ABOVE_BUTTON +
			autoplayFit.width * AUTOPLAY_PANEL_LIFT,
		width: autoplayFit.width,
	};
};

export type MenuPanelAnchor = {
	left: number;
	bottom: number;
	width: number;
	/** Portrait-only horizontal compensation when panel width fills the viewport. */
	translateX: number;
};

/** Anchor for the settings panel above the menu HUD button. */
export const computeMenuPanelAnchor = (layoutDerived: LayoutDerived): MenuPanelAnchor => {
	const canvas = layoutDerived.canvasSizes();
	const layoutType = layoutDerived.layoutType();
	const isPopoutSmall = isPopoutSmallViewport(canvas);
	const isPopout = isPopoutViewport(canvas) && !isPopoutSmall;
	const panelWidth = resolveMenuPanelWidth(canvas.width, layoutType, isPopoutSmall, isPopout);
	const drop = resolveMenuPanelDrop(panelWidth, isPopoutSmall);
	const extraLift = resolveMenuPanelExtraLift(panelWidth, isPopoutSmall);

	if (layoutType === 'portrait') {
		const hud = computePortraitHudCanvas(layoutDerived);
		const menuFit = fitPopupLeft(hud.util.x.menu, panelWidth, canvas.width, 'prefer-left');
		const minLeft = SCREEN_MARGIN;
		const maxLeft = Math.max(minLeft, canvas.width - SCREEN_MARGIN - menuFit.width);
		const idealLeft =
			hud.util.x.menu -
			menuFit.width * (MENU_PANEL_ANCHOR_X_FRACTION + MENU_PANEL_SHIFT_LEFT_PORTRAIT);
		const clampedLeft = clamp(idealLeft, minLeft, maxLeft);

		return {
			left: clampedLeft,
			translateX: idealLeft - clampedLeft,
			bottom:
				canvas.height -
				hud.util.centerY +
				hud.util.iconSize / 2 +
				GAP_ABOVE_BUTTON -
				drop +
				menuFit.width * MENU_PANEL_LIFT_PORTRAIT,
			width: menuFit.width,
		};
	}

	const hud = computeDesktopHudLayout(layoutDerived, resolveDesktopHudConfig(isPopoutSmall));
	const menuFit = fitPopupLeft(hud.menu.x, panelWidth, canvas.width, 'prefer-left');

	return {
		left: menuFit.left + menuFit.width * MENU_PANEL_SHIFT_LEFT,
		translateX: 0,
		bottom:
			canvas.height -
			hud.menu.y +
			hud.menu.size / 2 +
			GAP_ABOVE_BUTTON -
			drop +
			menuFit.width * MENU_PANEL_LIFT_DESKTOP +
			extraLift,
		width: menuFit.width,
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
		const menuWidth = resolveMenuWidth(canvas.width, layoutType, false, false);
		const menuDrop = resolveMenuPanelDrop(menuWidth, false);
		const autoplayFit = fitPopupLeft(
			hud.util.x.autoplay,
			autoplayWidth,
			canvas.width,
			'prefer-right',
		);
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
				bottom:
					canvas.height -
					hud.util.centerY +
					iconSize / 2 +
					gap -
					menuDrop +
					menuFit.width * MENU_PANEL_LIFT,
			},
		};
	}

	const isPopoutSmall = isPopoutSmallViewport(canvas);
	const isPopout = isPopoutViewport(canvas) && !isPopoutSmall;
	const hud = computeDesktopHudLayout(layoutDerived, resolveDesktopHudConfig(isPopoutSmall));
	const autoplayWidth = resolveAutoplayWidth(canvas.width, layoutType);
	const menuWidth = resolveMenuWidth(canvas.width, layoutType, isPopoutSmall, isPopout);
	const menuDrop = resolveMenuPanelDrop(menuWidth, isPopoutSmall);
	const menuExtraLift = resolveMenuPanelExtraLift(menuWidth, isPopoutSmall);
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
			bottom:
				canvas.height -
				hud.menu.y +
				hud.menu.size / 2 +
				gap -
				menuDrop +
				menuFit.width * MENU_PANEL_LIFT +
				menuExtraLift,
		},
	};
};
