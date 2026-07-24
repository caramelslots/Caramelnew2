import type { createLayout } from 'utils-layout';

import {
	BUY_PANEL_ASPECT,
	DESKTOP_UI_LAYOUT,
} from './constants';
import { DESKTOP_BASE_SIZE, DESKTOP_BACKGROUND_WIDTH_LIST, UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

type LayoutDerived = ReturnType<typeof createLayout>['stateLayoutDerived'];

export type DesktopHudLayoutConfig = {
	utilScale: number;
	barRaiseY: number;
	sideMarginFrac: number;
	itemGapFrac: number;
	buyBonusWidthFrac: number;
	balanceFontSize: number;
	balanceLineGap: number;
	balanceTextEm: number;
	rightGroupDropY: number;
	panelLabelFontFrac: number;
	spinCluster: (typeof DESKTOP_UI_LAYOUT)['spinCluster'];
};

export type DesktopHudPoint = { x: number; y: number };
export type DesktopHudPositions = {
	info: DesktopHudPoint & { size: number };
	menu: DesktopHudPoint & { size: number };
	buyBonus: DesktopHudPoint & { width: number; height: number; fontSize: number };
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
/** Floor only — never larger than canvas-fraction width on Popout S. */
const BUY_BONUS_MIN_WIDTH_PX = 40;

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
 * Single-row desktop HUD — three packed groups, same proportions on every
 * non-phone canvas:
 *   [i][☰][BUY BONUS]   [−][SPIN][+]   BALANCE/BET [AUTO][⚡]
 */
export const computeDesktopHudLayout = (
	layoutDerived: LayoutDerived,
	config: DesktopHudLayoutConfig,
): DesktopHudPositions => {
	const ml = layoutDerived.mainLayoutStandard();
	const canvas = layoutDerived.canvasSizes();
	const bar = utilBarOrigin(ml.width, ml.height);
	const cluster = config.spinCluster;

	const toCanvas = (lx: number, ly: number) => standardLocalToCanvas(lx, ly, layoutDerived);
	const toSize = (s: number) => standardLayoutSizeToCanvas(s, layoutDerived);

	const barY = toCanvas(0, bar.y + Y_BUTTON - config.barRaiseY).y;

	const sideMargin = canvas.width * config.sideMarginFrac;
	const gap = Math.max(6, canvas.width * config.itemGapFrac);

	const iconSize = toSize(UI_BASE_SIZE * 0.72 * config.utilScale);
	const spinSize = toSize(UI_BASE_SIZE * cluster.spinScale);
	const smallSize = toSize(UI_BASE_SIZE * cluster.smallScale);
	const turboSize = toSize(UI_BASE_SIZE * cluster.turboScale);
	const betGap = toSize(cluster.betControlsGap);
	const spinRaiseY = toSize(cluster.spinRaiseY ?? 0);

	/**
	 * Buy Bonus + Auto share the same panel sprite / aspect.
	 * If height would exceed the HUD row, shrink width too so buttons don’t stretch.
	 */
	const panelHMax = iconSize * 1.05;
	let buyBonusW = Math.max(BUY_BONUS_MIN_WIDTH_PX, canvas.width * config.buyBonusWidthFrac);
	let buyBonusH = buyBonusW / BUY_PANEL_ASPECT;
	if (buyBonusH > panelHMax) {
		buyBonusH = panelHMax;
		buyBonusW = buyBonusH * BUY_PANEL_ASPECT;
	}
	let autoplayWidth = buyBonusW * cluster.autoplayScale;
	let autoplayHeight = autoplayWidth / BUY_PANEL_ASPECT;
	if (autoplayHeight > panelHMax) {
		autoplayHeight = panelHMax;
		autoplayWidth = autoplayHeight * BUY_PANEL_ASPECT;
	}

	const balanceFontSize = toSize(config.balanceFontSize);
	const balanceLineGap = toSize(config.balanceLineGap);
	const balanceBlockW = balanceFontSize * config.balanceTextEm;
	const rightGroupY = barY + toSize(config.rightGroupDropY);

	const iconHalf = iconSize / 2;
	const spinHalf = spinSize / 2;
	const smallHalf = smallSize / 2;
	const autoplayHalfW = autoplayWidth / 2;
	const turboHalf = turboSize / 2;

	/** Center group — Spin X as canvas fraction (slightly left of true center). */
	const spinX = canvas.width * cluster.clusterCenterXFrac;
	const decreaseX = spinX - spinHalf - betGap - smallHalf;
	const increaseX = spinX + spinHalf + betGap + smallHalf;

	/** Left group — packed from the left margin: i → ☰ → BUY BONUS. */
	const infoX = sideMargin + iconHalf;
	const menuX = infoX + iconHalf + gap + iconHalf;
	let buyW = buyBonusW;
	let buyH = buyBonusH;
	let buyBonusX = menuX + iconHalf + gap + buyW / 2;

	const centerLeft = decreaseX - smallHalf;
	if (buyBonusX + buyW / 2 + gap > centerLeft) {
		const maxBuyW = Math.max(
			BUY_BONUS_MIN_WIDTH_PX,
			centerLeft - gap - (menuX + iconHalf + gap),
		);
		buyW = Math.min(buyBonusW, maxBuyW);
		buyH = buyW / BUY_PANEL_ASPECT;
		if (buyH > panelHMax) {
			buyH = panelHMax;
			buyW = buyH * BUY_PANEL_ASPECT;
		}
		buyBonusX = menuX + iconHalf + gap + buyW / 2;
	}

	/**
	 * Right group as one rigid pack ending at the right margin:
	 * Balance/Bet → Auto → Turbo
	 */
	const rightPackW = balanceBlockW + gap + autoplayWidth + gap + turboSize;
	const centerRight = increaseX + smallHalf;
	const rightPackLeftIdeal = canvas.width - sideMargin - rightPackW;
	const rightPackLeft = Math.max(centerRight + gap, rightPackLeftIdeal);

	/** balanceAnchorX = right edge of text (CSS translateX(-100%)). */
	const balanceAnchorX = rightPackLeft + balanceBlockW;
	const autoX = balanceAnchorX + gap + autoplayHalfW;
	const turbX = autoX + autoplayHalfW + gap + turboHalf;

	return {
		info: { x: infoX, y: barY, size: iconSize },
		menu: { x: menuX, y: barY, size: iconSize },
		buyBonus: {
			x: buyBonusX,
			y: barY,
			width: buyW,
			height: buyH,
			/** Direct fraction of button height — no px floor (it deadened Popout S knobs). */
			fontSize: buyH * config.panelLabelFontFrac,
		},
		decrease: { x: decreaseX, y: barY, size: smallSize },
		spin: { x: spinX, y: barY + spinRaiseY, size: spinSize },
		increase: { x: increaseX, y: barY, size: smallSize },
		autoplay: {
			x: autoX,
			y: rightGroupY,
			width: autoplayWidth,
			height: autoplayHeight,
			fontSize: autoplayHeight * config.panelLabelFontFrac,
		},
		turbo: { x: turbX, y: rightGroupY, size: turboSize },
		balance: {
			x: balanceAnchorX,
			y: rightGroupY - balanceLineGap,
			fontSize: balanceFontSize,
		},
		bet: {
			x: balanceAnchorX,
			y: rightGroupY + balanceLineGap,
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
	buyBonusWidthFrac: DESKTOP_UI_LAYOUT.buyBonusWidthFrac,
	balanceFontSize: DESKTOP_UI_LAYOUT.balanceFontSize,
	balanceLineGap: DESKTOP_UI_LAYOUT.balanceLineGap,
	balanceTextEm: DESKTOP_UI_LAYOUT.balanceTextEm,
	rightGroupDropY: DESKTOP_UI_LAYOUT.rightGroupDropY,
	panelLabelFontFrac: isPopoutSmall
		? DESKTOP_UI_LAYOUT.popoutSmall.panelLabelFontFrac
		: DESKTOP_UI_LAYOUT.panelLabelFontFrac,
	spinCluster: DESKTOP_UI_LAYOUT.spinCluster,
});
