import type { createLayout } from 'utils-layout';

import {
	BOARD_LAYOUT_OFFSETS,
	BOARD_SIZES,
	getPortraitBoardScale,
	getPortraitParchmentSize,
	PORTRAIT_UI_LAYOUT,
} from './constants';

type LayoutDerived = ReturnType<typeof createLayout>['stateLayoutDerived'];

/** Scale ref px to game mainLayout height (portrait 1422). */
export const portraitScaleY = (px: number, layoutHeight: number) =>
	(px / PORTRAIT_UI_LAYOUT.refHeight) * layoutHeight;

export const portraitYFromBottom = (px: number, layoutHeight: number) =>
	layoutHeight - portraitScaleY(px, layoutHeight);

/** Board bottom in game-layout local Y (same space as UiCashStacksPortraitLayout). */
export const portraitBoardBottomLocal = (layoutDerived: LayoutDerived) => {
	const layoutType = layoutDerived.layoutType();
	const ml = layoutDerived.mainLayout();
	const off = BOARD_LAYOUT_OFFSETS[layoutType] ?? { x: 0, y: 0 };
	const halfH =
		layoutType === 'portrait'
			? (getPortraitParchmentSize().height / 2) *
					getPortraitBoardScale(ml.scale, layoutDerived.canvasSizeType())
			: BOARD_SIZES.height / 2;
	return ml.height * 0.5 + off.y + halfH;
};

export type PortraitHudY = {
	boardBottomLocal: number;
	buyPanelTopLocal: number;
	buyPanelBottomLocal: number;
	spinCenterY: number;
	utilCenterY: number;
};

/** Stacked portrait HUD Y positions in game mainLayout space (no overlap). */
export const computePortraitHudY = (
	layoutDerived: LayoutDerived,
	spinHalf: number,
	utilRowHalf: number,
): PortraitHudY => {
	const H = layoutDerived.mainLayout().height;
	const btn = PORTRAIT_UI_LAYOUT.buttons;
	const boardBottomLocal = portraitBoardBottomLocal(layoutDerived);

	const buyPanelTopLocal =
		boardBottomLocal + portraitScaleY(PORTRAIT_UI_LAYOUT.buyPanelBelowBoard, H);
	const buyPanelBottomLocal = buyPanelTopLocal + portraitScaleY(btn.buyRowMinH, H);
	// Позиции не меняем при FS — turbo/util-ряд остаётся на месте, скрывается только spin-кластер.
	const spinStackAnchor = buyPanelBottomLocal;
	const spinFromStack =
		spinStackAnchor +
		portraitScaleY(PORTRAIT_UI_LAYOUT.spinAboveBuyGap, H) +
		spinHalf;
	let spinCenterY = Math.max(
		portraitYFromBottom(PORTRAIT_UI_LAYOUT.spinFromBottom, H),
		spinFromStack,
	);
	spinCenterY += portraitScaleY(PORTRAIT_UI_LAYOUT.spinNudgeDown, H);

	const utilFromStack =
		spinCenterY + spinHalf + portraitScaleY(PORTRAIT_UI_LAYOUT.utilBelowSpinGap, H) + utilRowHalf;
	let utilCenterY = Math.max(
		portraitYFromBottom(PORTRAIT_UI_LAYOUT.utilFromBottom, H),
		utilFromStack,
	);

	const utilMargin = portraitScaleY(28, H);
	const maxUtilY = H - utilMargin;
	if (utilCenterY > maxUtilY) {
		utilCenterY = maxUtilY;
		spinCenterY = Math.min(
			spinCenterY,
			utilCenterY -
				portraitScaleY(PORTRAIT_UI_LAYOUT.utilBelowSpinGap, H) -
				spinHalf,
		);
	}

	utilCenterY += portraitScaleY(PORTRAIT_UI_LAYOUT.utilNudgeDown, H);

	return {
		boardBottomLocal,
		buyPanelTopLocal,
		buyPanelBottomLocal,
		spinCenterY,
		utilCenterY,
	};
};

/** Game-layout local X (ref 800) → canvas CSS px (matches MainContainer bottom layout). */
export const portraitLocalToCanvasX = (localX: number, layoutDerived: LayoutDerived) => {
	const ml = layoutDerived.mainLayout();
	return ml.x + (localX - ml.width / 2) * ml.scale;
};

/** Game-layout local Y (ref 1422) → canvas CSS px (matches MainContainer bottom layout). */
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
	const boardBottomLocal = portraitBoardBottomLocal(layoutDerived);
	const buyPanelTopLocal =
		boardBottomLocal + portraitScaleY(PORTRAIT_UI_LAYOUT.buyPanelBelowBoard, H);
	return portraitLocalToCanvasY(buyPanelTopLocal, layoutDerived);
};
