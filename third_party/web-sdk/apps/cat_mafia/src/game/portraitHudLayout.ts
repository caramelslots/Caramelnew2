import type { createLayout } from 'utils-layout';

import {
	BOARD_LAYOUT_OFFSETS,
	BOARD_SIZES,
	BUY_BONUS_BUTTON_ASPECT,
	getPortraitBoardScale,
	getPortraitDeviceWidth,
	getPortraitParchmentSize,
	PORTRAIT_UI_LAYOUT,
} from './constants';

type LayoutDerived = ReturnType<typeof createLayout>['stateLayoutDerived'];

/** Scale ref px to game mainLayout height (portrait 1422). */
export const portraitScaleY = (px: number, layoutHeight: number) =>
	(px / PORTRAIT_UI_LAYOUT.refHeight) * layoutHeight;

export const portraitYFromBottom = (px: number, layoutHeight: number) =>
	layoutHeight - portraitScaleY(px, layoutHeight);

/** Ref px → canvas CSS px (length). */
export const portraitRefToCanvasLength = (refPx: number, layoutDerived: LayoutDerived) => {
	const canvasH = layoutDerived.canvasSizes().height;
	return (refPx / PORTRAIT_UI_LAYOUT.refHeight) * canvasH;
};

/** Canvas Y of a point `refPx` above the viewport bottom. */
export const portraitCanvasYFromBottom = (refPx: number, layoutDerived: LayoutDerived) =>
	layoutDerived.canvasSizes().height - portraitRefToCanvasLength(refPx, layoutDerived);

/** Visible buy bonus HUD button width in canvas CSS px. */
export const portraitBuyPanelSizeCanvas = (layoutDerived: LayoutDerived) =>
	portraitRefToCanvasLength(
		PORTRAIT_UI_LAYOUT.buttons.spinBetDiam * PORTRAIT_UI_LAYOUT.buyBonusButtonScale,
		layoutDerived,
	);

/** Visible buy bonus HUD button height in canvas CSS px. */
export const portraitBuyPanelHeightCanvas = (layoutDerived: LayoutDerived) =>
	portraitBuyPanelSizeCanvas(layoutDerived) / BUY_BONUS_BUTTON_ASPECT;

/** Layout-only buy panel width — frozen wide footprint for mascot / coin fly anchors. */
export const portraitBuyPanelLayoutSizeCanvas = (layoutDerived: LayoutDerived) => {
	const { width: canvasW } = layoutDerived.canvasSizes();
	return Math.min(
		canvasW * PORTRAIT_UI_LAYOUT.buyPanelLayoutWidthVw,
		PORTRAIT_UI_LAYOUT.buyPanelLayoutMaxWidth,
	);
};

/** Layout-only buy panel height — mascot must not shrink when HUD button art does. */
export const portraitBuyPanelLayoutHeightCanvas = (layoutDerived: LayoutDerived) =>
	portraitBuyPanelLayoutSizeCanvas(layoutDerived) * PORTRAIT_UI_LAYOUT.buyPanelLayoutAspect;

/**
 * Board offset the portrait HUD is anchored to — frozen at the pre-lift value
 * so raising the board via BOARD_LAYOUT_OFFSETS.portrait.y lifts only the
 * board assembly; Buy Bonus / WIN / spin cluster / mascot keep their places.
 */
export const PORTRAIT_HUD_BOARD_OFFSET_Y = -222;

/**
 * Board-bottom local Y used as the portrait HUD anchor (same space as
 * UiCashStacksPortraitLayout). NOT the live board bottom — see above.
 */
export const portraitHudBoardBottomLocal = (layoutDerived: LayoutDerived) => {
	const layoutType = layoutDerived.layoutType();
	const ml = layoutDerived.mainLayout();
	const off = BOARD_LAYOUT_OFFSETS[layoutType] ?? { x: 0, y: 0 };
	const offsetY = layoutType === 'portrait' ? PORTRAIT_HUD_BOARD_OFFSET_Y : off.y;
	const halfH =
		layoutType === 'portrait'
			? (getPortraitParchmentSize().height / 2) *
					getPortraitBoardScale(
						ml.scale,
						layoutDerived.canvasSizeType(),
						getPortraitDeviceWidth(layoutDerived.canvasSizes()),
					)
			: BOARD_SIZES.height / 2;
	return ml.height * 0.5 + offsetY + halfH;
};

/** WIN label Y — anchored to live board bottom (same idea as desktop UiCashStacksLayout). */
export const portraitWinHudLocalY = (
	layoutDerived: LayoutDerived,
	boardLayout: { y: number; visualHeight: number },
) => {
	const H = layoutDerived.mainLayout().height;
	const gap = portraitScaleY(PORTRAIT_UI_LAYOUT.winBelowBoardGap, H);
	const nudge = portraitScaleY(PORTRAIT_UI_LAYOUT.winNudgeDown, H);
	return boardLayout.y + boardLayout.visualHeight / 2 + gap + nudge;
};

export type PortraitHudCanvas = {
	buyPanelBottomCanvas: number;
	spin: {
		centerX: number;
		centerY: number;
		raiseY: number;
		size: number;
		smallSize: number;
		betControlOffsetX: number;
	};
	util: {
		centerY: number;
		iconSize: number;
		fontSize: number;
		x: {
			info: number;
			menu: number;
			autoplay: number;
			turbo: number;
		};
		balance: {
			centerX: number;
			maxWidth: number;
		};
	};
};

/**
 * Portrait HUD positions in canvas CSS px.
 * Spin-кластер — по центру между buy/boost и util-рядом. Util — у низа экрана.
 */
export const computePortraitHudCanvas = (
	layoutDerived: LayoutDerived,
	opts?: { buyPanelBottomCanvas?: number; hideAutoplay?: boolean },
): PortraitHudCanvas => {
	const btn = PORTRAIT_UI_LAYOUT.buttons;
	const canvas = layoutDerived.canvasSizes();
	const refLen = (px: number) => portraitRefToCanvasLength(px, layoutDerived);

	const spinSize = refLen(btn.spinDiam);
	const spinHalf = spinSize / 2;
	const smallSize = refLen(btn.spinBetDiam);
	const smallHalf = smallSize / 2;
	const spinClusterCenterX =
		canvas.width * 0.5 +
		(PORTRAIT_UI_LAYOUT.spinClusterShiftX / PORTRAIT_UI_LAYOUT.refWidth) * canvas.width;
	const betControlOffsetX = spinHalf + refLen(btn.spinBetGap) + smallHalf;

	const buyPanelTopCanvas = portraitBuyPanelCanvasTop(layoutDerived);
	const buyPanelBottomCanvas =
		opts?.buyPanelBottomCanvas ??
		buyPanelTopCanvas + portraitBuyPanelHeightCanvas(layoutDerived);

	const utilCenterY = portraitCanvasYFromBottom(PORTRAIT_UI_LAYOUT.utilFromBottom, layoutDerived);
	const utilTopCanvas = utilCenterY - smallSize / 2;
	// Центр spin-кластера (−/+ якорь) — ровно между низом buy/boost и верхом util-ряда.
	const spinCenterY = (buyPanelBottomCanvas + utilTopCanvas) / 2;

	const localX = (refX: number) =>
		portraitLocalToCanvasX(
			(refX / PORTRAIT_UI_LAYOUT.refWidth) * layoutDerived.mainLayout().width,
			layoutDerived,
		);

	const spreadIconPair = (leftX: number, rightX: number) => {
		const minStep = smallSize + refLen(PORTRAIT_UI_LAYOUT.utilIconGap);
		if (rightX - leftX >= minStep) return [leftX, rightX] as const;
		const mid = (leftX + rightX) / 2;
		return [mid - minStep / 2, mid + minStep / 2] as const;
	};

	const [infoX, menuX] = spreadIconPair(
		localX(PORTRAIT_UI_LAYOUT.utilX.info),
		localX(PORTRAIT_UI_LAYOUT.utilX.menu),
	);
	const [autoplayX, turboX] = spreadIconPair(
		localX(PORTRAIT_UI_LAYOUT.utilX.autoplay),
		localX(PORTRAIT_UI_LAYOUT.utilX.turbo),
	);

	const balanceTextGap = refLen(PORTRAIT_UI_LAYOUT.utilBalanceTextGap);
	const menuRight = menuX + smallSize / 2;
	const rightIconLeft = opts?.hideAutoplay ? turboX - smallSize / 2 : autoplayX - smallSize / 2;
	const balanceLeft = menuRight + balanceTextGap;
	const balanceRight = rightIconLeft - balanceTextGap;
	const balanceMaxWidth = Math.max(0, balanceRight - balanceLeft);
	const balanceCenterX = canvas.width * 0.5;

	return {
		buyPanelBottomCanvas,
		spin: {
			centerX: spinClusterCenterX,
			centerY: spinCenterY,
			raiseY: refLen(btn.spinRaiseY),
			size: spinSize,
			smallSize,
			betControlOffsetX,
		},
		util: {
			centerY: utilCenterY,
			iconSize: smallSize,
			fontSize: refLen(PORTRAIT_UI_LAYOUT.utilBalanceFontSize),
			x: {
				info: infoX,
				menu: menuX,
				autoplay: autoplayX,
				turbo: turboX,
			},
			balance: {
				centerX: balanceCenterX,
				maxWidth: balanceMaxWidth,
			},
		},
	};
};

/** Game-layout local X (ref 800) → canvas CSS px. */
export const portraitLocalToCanvasX = (localX: number, layoutDerived: LayoutDerived) => {
	const ml = layoutDerived.mainLayout();
	return ml.x + (localX - ml.width / 2) * ml.scale;
};

/** Game-layout local Y (ref 1422) → canvas CSS px (center-aligned MainContainer). */
export const portraitLocalToCanvasY = (localY: number, layoutDerived: LayoutDerived) => {
	const ml = layoutDerived.mainLayout();
	return ml.y + (localY - ml.height / 2) * ml.scale;
};

/** Layout-space length → canvas CSS px. */
export const portraitLayoutSizeToCanvas = (layoutPx: number, layoutDerived: LayoutDerived) =>
	layoutPx * layoutDerived.mainLayout().scale;

/** Ref X (800×1422 mockup) → game-layout local X. */
export const portraitRefXToLocal = (refPx: number, layoutDerived: LayoutDerived) =>
	(refPx / PORTRAIT_UI_LAYOUT.refWidth) * layoutDerived.mainLayout().width;

/** Buy-bonus HTML panel top in canvas px. */
export const portraitBuyPanelCanvasTop = (layoutDerived: LayoutDerived) => {
	const ml = layoutDerived.mainLayout();
	const H = ml.height;
	const boardBottomLocal = portraitHudBoardBottomLocal(layoutDerived);
	const buyPanelTopLocal =
		boardBottomLocal + portraitScaleY(PORTRAIT_UI_LAYOUT.buyPanelBelowBoard, H);
	return portraitLocalToCanvasY(buyPanelTopLocal, layoutDerived);
};

/** Buy-bonus HTML panel center X in canvas px (left of screen center on phone). */
export const portraitBuyPanelCanvasCenterX = (layoutDerived: LayoutDerived) =>
	portraitLocalToCanvasX(
		portraitRefXToLocal(PORTRAIT_UI_LAYOUT.buyPanelCenterRefX, layoutDerived),
		layoutDerived,
	);
