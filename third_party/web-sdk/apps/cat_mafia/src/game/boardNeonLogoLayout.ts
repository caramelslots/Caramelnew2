import type { createLayout } from 'utils-layout';

import { isPopoutViewport } from './constants';
import { LOADER_NEON_LOGO_ASPECT } from './loaderCardAssets';
import { isPhoneCanvasSizeType } from './streetOffscreenCull';

type LayoutDerived = ReturnType<typeof createLayout>['stateLayoutDerived'];

type BoardLayout = {
	x: number;
	y: number;
	visualWidth: number;
	visualHeight: number;
};

/** Logo height as a fraction of on-screen board height. */
const LOGO_HEIGHT_FRAC = 0.28;
/** Gap between logo right edge and board left edge (fraction of board height). */
const LOGO_GAP_FRAC = 0.08;
/**
 * Vertical centre of the logo as a fraction of board height from the board top.
 * 0.5 = board centre.
 */
const LOGO_CENTER_Y_FRAC = 0.42;

export type BoardNeonLogoScreenBox = {
	show: boolean;
	left: number;
	top: number;
	width: number;
	height: number;
};

/**
 * MEOWFIA neon logo to the left of the slot board.
 * Size + gap scale with board screen size so PC / laptop / tablet / popout stay consistent.
 * Hidden only on phone portrait tiers — popout L/S still show (narrow width looks like mobile).
 */
export const computeBoardNeonLogoScreenBox = (opts: {
	layoutDerived: LayoutDerived;
	board: BoardLayout;
}): BoardNeonLogoScreenBox => {
	const { layoutDerived, board } = opts;
	const canvasSizes = layoutDerived.canvasSizes();
	const isPopout = isPopoutViewport(canvasSizes);

	if (isPhoneCanvasSizeType(layoutDerived.canvasSizeType()) && !isPopout) {
		return { show: false, left: 0, top: 0, width: 0, height: 0 };
	}

	const ml = layoutDerived.mainLayout();
	const boardScreenW = board.visualWidth * ml.scale;
	const boardScreenH = board.visualHeight * ml.scale;
	const centerX = ml.x + (board.x - ml.width * 0.5) * ml.scale;
	const centerY = ml.y + (board.y - ml.height * 0.5) * ml.scale;
	const boardLeft = centerX - boardScreenW * 0.5;
	const boardTop = centerY - boardScreenH * 0.5;

	const height = boardScreenH * LOGO_HEIGHT_FRAC;
	const width = height * LOADER_NEON_LOGO_ASPECT;
	const gap = boardScreenH * LOGO_GAP_FRAC;
	const left = boardLeft - gap - width;
	const top = boardTop + boardScreenH * LOGO_CENTER_Y_FRAC - height * 0.5;

	return {
		show: true,
		left: Math.round(left),
		top: Math.round(top),
		width: Math.round(width),
		height: Math.round(height),
	};
};
