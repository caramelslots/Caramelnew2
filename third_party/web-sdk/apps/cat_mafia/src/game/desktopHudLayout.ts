import type { createLayout } from 'utils-layout';

import {
	AUTOPLAY_PILL_ASPECT,
	BUY_BONUS_BUTTON_ASPECT,
	BUY_BONUS_BUTTON_SCALE,
	DESKTOP_UI_LAYOUT,
} from './constants';
import { DESKTOP_BASE_SIZE, DESKTOP_BACKGROUND_WIDTH_LIST, UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

type LayoutDerived = ReturnType<typeof createLayout>['stateLayoutDerived'];

export type DesktopHudLayoutConfig = {
	utilScale: number;
	barRaiseY: number;
	sideMarginFrac: number;
	itemGapFrac: number;
	balanceFontSize: number;
	balanceLineGap: number;
	balanceTextEm: number;
	rightGroupDropY: number;
	balanceMenuGap: number;
	buyBonusAboveGap: number;
	panelLabelFontFrac: number;
	spinCluster: (typeof DESKTOP_UI_LAYOUT)['spinCluster'];
};

export type DesktopHudPoint = { x: number; y: number };
export type DesktopHudPositions = {
	info: DesktopHudPoint & { size: number };
	menu: DesktopHudPoint & { size: number };
	buyBonus: DesktopHudPoint & { size: number };
	balance: DesktopHudPoint & { fontSize: number };
	bet: DesktopHudPoint & { fontSize: number };
	decrease: DesktopHudPoint & { size: number };
	spin: DesktopHudPoint & { size: number };
	increase: DesktopHudPoint & { size: number };
	autoplay: DesktopHudPoint & { width: number; height: number; fontSize: number };
	turbo: DesktopHudPoint & { size: number };
};

const TOTAL_BAR_WIDTH = DESKTOP_BACKGROUND_WIDTH_LIST.reduce((sum, w) => sum + w, 0);
const Y_BUTTON = DESKTOP_BASE_SIZE * 0.5;

/** Standard mainLayout local → canvas CSS px (MainContainer standard, alignVertical bottom). */
export const standardLocalToCanvas = (localX: number, localY: number, layoutDerived: LayoutDerived) => {
	const ml = layoutDerived.mainLayoutStandard();
	const canvas = layoutDerived.canvasSizes();
	const bottomY = canvas.height * 0.5 - ml.height * ml.scale * 0.5;
	return {
		x: ml.x + (localX - ml.width / 2) * ml.scale,
		y: bottomY + ml.y + (localY - ml.height / 2) * ml.scale,
	};
};

export const standardLayoutSizeToCanvas = (layoutPx: number, layoutDerived: LayoutDerived) =>
	layoutPx * layoutDerived.mainLayoutStandard().scale;

const utilBarOrigin = (layoutWidth: number, layoutHeight: number) => ({
	x: layoutWidth * 0.5 - TOTAL_BAR_WIDTH / 2,
	y: layoutHeight - DESKTOP_BASE_SIZE - 10,
});

/**
 * Desktop HUD layout:
 *        [BUY BONUS]
 *   [i][☰] BALANCE/BET          [AUTO][−][SPIN][+][⚡]
 * When `hideAutoplay`: BALANCE/BET [−][SPIN][+][⚡].
 */
export const computeDesktopHudLayout = (
	layoutDerived: LayoutDerived,
	config: DesktopHudLayoutConfig,
	opts?: { hideAutoplay?: boolean },
): DesktopHudPositions => {
	const hideAutoplay = opts?.hideAutoplay === true;
	const ml = layoutDerived.mainLayoutStandard();
	const canvas = layoutDerived.canvasSizes();
	const bar = utilBarOrigin(ml.width, ml.height);
	const cluster = config.spinCluster;

	const toCanvas = (lx: number, ly: number) => standardLocalToCanvas(lx, ly, layoutDerived);
	const toSize = (s: number) => standardLayoutSizeToCanvas(s, layoutDerived);

	const barY = toCanvas(0, bar.y + Y_BUTTON - config.barRaiseY).y;

	const sideMargin = canvas.width * config.sideMarginFrac;
	const gap = Math.max(6, canvas.width * config.itemGapFrac);

	const spinSize = toSize(UI_BASE_SIZE * cluster.spinScale);
	const smallSize = toSize(UI_BASE_SIZE * cluster.smallScale);
	const betGap = toSize(cluster.betControlsGap);
	const spinRaiseY = toSize(cluster.spinRaiseY ?? 0);

	const balanceFontSize = toSize(config.balanceFontSize);
	const balanceLineGap = toSize(config.balanceLineGap);
	const balanceMenuGap = toSize(config.balanceMenuGap);
	const buyBonusAboveGap = toSize(config.buyBonusAboveGap);
	const rightGroupY = barY + toSize(config.rightGroupDropY);

	const smallHalf = smallSize / 2;
	const spinHalf = spinSize / 2;

	let autoplayWidth = toSize(UI_BASE_SIZE * 1.0) * cluster.autoplayScale;
	let autoplayHeight = autoplayWidth / AUTOPLAY_PILL_ASPECT;
	const autoplayHMax = toSize(UI_BASE_SIZE * cluster.autoplayMaxHeightScale);
	if (autoplayHeight > autoplayHMax) {
		autoplayHeight = autoplayHMax;
		autoplayWidth = autoplayHeight * AUTOPLAY_PILL_ASPECT;
	}
	if (hideAutoplay) {
		autoplayWidth = 0;
		autoplayHeight = 0;
	}
	const autoplayHalfW = autoplayWidth / 2;

	/**
	 * Right group — packed from the right margin inward:
	 * Turbo ← [+] ← SPIN ← [−] ← Auto (pill)
	 */
	const turbX = canvas.width - sideMargin - smallHalf;
	const increaseX = turbX - smallHalf - betGap - smallHalf;
	const spinX = increaseX - smallHalf - betGap - spinHalf;
	const decreaseX = spinX - spinHalf - betGap - smallHalf;
	const autoX = hideAutoplay
		? decreaseX - smallHalf - gap
		: decreaseX - smallHalf - betGap - autoplayHalfW;

	/** Left group — bottom row: i → ☰; balance/bet hug menu on the right. */
	const infoX = sideMargin + smallHalf;
	const menuX = infoX + smallHalf + gap + smallHalf;
	const balanceLeftX = menuX + smallHalf + balanceMenuGap;

	/** Buy Bonus octagon above info + menu. */
	const buyBonusCenterX = (infoX + menuX) / 2;
	const buySize = smallSize * BUY_BONUS_BUTTON_SCALE;
	const buyBonusHeight = buySize / BUY_BONUS_BUTTON_ASPECT;
	const buyBonusY = barY - smallHalf - buyBonusAboveGap - buyBonusHeight / 2;

	return {
		info: { x: infoX, y: barY, size: smallSize },
		menu: { x: menuX, y: barY, size: smallSize },
		buyBonus: {
			x: buyBonusCenterX,
			y: buyBonusY,
			size: buySize,
		},
		decrease: { x: decreaseX, y: rightGroupY, size: smallSize },
		spin: { x: spinX, y: rightGroupY + spinRaiseY, size: spinSize },
		increase: { x: increaseX, y: rightGroupY, size: smallSize },
		autoplay: {
			x: autoX,
			y: rightGroupY,
			width: autoplayWidth,
			height: autoplayHeight,
			fontSize: autoplayHeight * config.panelLabelFontFrac,
		},
		turbo: { x: turbX, y: rightGroupY, size: smallSize },
		balance: {
			x: balanceLeftX,
			y: barY - balanceLineGap,
			fontSize: balanceFontSize,
		},
		bet: {
			x: balanceLeftX,
			y: barY + balanceLineGap,
			fontSize: balanceFontSize,
		},
	};
};

/** Desktop / Popout L share knobs; Popout S only shrinks panel label type. */
export const resolveDesktopHudConfig = (isPopoutSmall = false): DesktopHudLayoutConfig => ({
	utilScale: DESKTOP_UI_LAYOUT.utilScale,
	barRaiseY: DESKTOP_UI_LAYOUT.barRaiseY,
	sideMarginFrac: DESKTOP_UI_LAYOUT.sideMarginFrac,
	itemGapFrac: DESKTOP_UI_LAYOUT.itemGapFrac,
	balanceFontSize: DESKTOP_UI_LAYOUT.balanceFontSize,
	balanceLineGap: DESKTOP_UI_LAYOUT.balanceLineGap,
	balanceTextEm: DESKTOP_UI_LAYOUT.balanceTextEm,
	rightGroupDropY: DESKTOP_UI_LAYOUT.rightGroupDropY,
	balanceMenuGap: DESKTOP_UI_LAYOUT.balanceMenuGap,
	buyBonusAboveGap: DESKTOP_UI_LAYOUT.buyBonusAboveGap,
	panelLabelFontFrac: isPopoutSmall
		? DESKTOP_UI_LAYOUT.popoutSmall.panelLabelFontFrac
		: DESKTOP_UI_LAYOUT.panelLabelFontFrac,
	spinCluster: DESKTOP_UI_LAYOUT.spinCluster,
});
