import type { createLayout } from 'utils-layout';

import {
	AUTOPLAY_PILL_BASE,
	DESKTOP_UI_LAYOUT,
} from './constants';
import { DESKTOP_BASE_SIZE, DESKTOP_BACKGROUND_WIDTH_LIST, UI_BASE_SIZE } from 'components-ui-pixi/src/constants';

type LayoutDerived = ReturnType<typeof createLayout>['stateLayoutDerived'];

export type DesktopHudLayoutConfig = {
	utilScale: number;
	utilX: (typeof DESKTOP_UI_LAYOUT)['utilX'];
	spinCluster: (typeof DESKTOP_UI_LAYOUT)['spinCluster'];
};

export type DesktopHudPoint = { x: number; y: number };
export type DesktopHudPositions = {
	info: DesktopHudPoint & { size: number };
	menu: DesktopHudPoint & { size: number };
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
const Y_BALANCE_LINE = Y_BUTTON - 16;
const Y_BET_LINE = Y_BUTTON + 16;

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

export const computeDesktopHudLayout = (
	layoutDerived: LayoutDerived,
	config: DesktopHudLayoutConfig,
): DesktopHudPositions => {
	const ml = layoutDerived.mainLayoutStandard();
	const bar = utilBarOrigin(ml.width, ml.height);
	const SPIN_CLUSTER = {
		...config.spinCluster,
		centerYOffset: Y_BUTTON - 96,
	};

	const spinHalf = (UI_BASE_SIZE * SPIN_CLUSTER.spinScale) / 2;
	const smallHalf = (UI_BASE_SIZE * SPIN_CLUSTER.smallScale) / 2;
	const betControlOffsetX = spinHalf + SPIN_CLUSTER.betControlsGap + smallHalf;
	const autoplayHalfW = (AUTOPLAY_PILL_BASE.width * SPIN_CLUSTER.autoplayScale) / 2;
	const autoplayHalfH = (AUTOPLAY_PILL_BASE.height * SPIN_CLUSTER.autoplayScale) / 2;
	const turboHalf = (UI_BASE_SIZE * SPIN_CLUSTER.turboScale) / 2;
	const autoplayOffsetY = spinHalf + SPIN_CLUSTER.autoplayGap + autoplayHalfH;
	const turboOffsetX =
		(SPIN_CLUSTER.shiftX ?? 0) + autoplayHalfW + SPIN_CLUSTER.turboGap + turboHalf;
	const spinClusterCenterX =
		ml.width - SPIN_CLUSTER.rightPad - betControlOffsetX - smallHalf;
	const clusterY = ml.height - DESKTOP_BASE_SIZE - 10 + SPIN_CLUSTER.centerYOffset;
	const shiftX = SPIN_CLUSTER.shiftX ?? 0;

	const iconLayoutSize = UI_BASE_SIZE * 0.72 * config.utilScale;
	const spinLayoutSize = UI_BASE_SIZE * SPIN_CLUSTER.spinScale;
	const smallLayoutSize = UI_BASE_SIZE * SPIN_CLUSTER.smallScale;
	const turboLayoutSize = UI_BASE_SIZE * SPIN_CLUSTER.turboScale;
	const autoplayW = AUTOPLAY_PILL_BASE.width * SPIN_CLUSTER.autoplayScale;
	const autoplayH = AUTOPLAY_PILL_BASE.height * SPIN_CLUSTER.autoplayScale;

	const toCanvas = (lx: number, ly: number) => standardLocalToCanvas(lx, ly, layoutDerived);
	const toSize = (s: number) => standardLayoutSizeToCanvas(s, layoutDerived);

	return {
		info: { ...toCanvas(bar.x + config.utilX.info, bar.y + Y_BUTTON), size: toSize(iconLayoutSize) },
		menu: { ...toCanvas(bar.x + config.utilX.menu, bar.y + Y_BUTTON), size: toSize(iconLayoutSize) },
		balance: {
			...toCanvas(bar.x + config.utilX.hudText, bar.y + Y_BALANCE_LINE),
			fontSize: toSize(24),
		},
		bet: {
			...toCanvas(bar.x + config.utilX.hudText, bar.y + Y_BET_LINE),
			fontSize: toSize(24),
		},
		decrease: {
			...toCanvas(spinClusterCenterX + shiftX - betControlOffsetX, clusterY),
			size: toSize(smallLayoutSize),
		},
		spin: {
			...toCanvas(spinClusterCenterX + shiftX, clusterY + (SPIN_CLUSTER.spinRaiseY ?? 0)),
			size: toSize(spinLayoutSize),
		},
		increase: {
			...toCanvas(spinClusterCenterX + shiftX + betControlOffsetX, clusterY),
			size: toSize(smallLayoutSize),
		},
		autoplay: {
			...toCanvas(spinClusterCenterX + shiftX, clusterY + autoplayOffsetY),
			width: toSize(autoplayW),
			height: toSize(autoplayH),
			fontSize: toSize(autoplayH * 0.42),
		},
		turbo: {
			...toCanvas(spinClusterCenterX + turboOffsetX, clusterY + autoplayOffsetY),
			size: toSize(turboLayoutSize),
		},
	};
};

export const resolveDesktopHudConfig = (isPopoutSmall: boolean): DesktopHudLayoutConfig =>
	isPopoutSmall
		? {
				utilScale: DESKTOP_UI_LAYOUT.popoutSmall.utilScale,
				utilX: DESKTOP_UI_LAYOUT.popoutSmall.utilX,
				spinCluster: {
					...DESKTOP_UI_LAYOUT.spinCluster,
					...DESKTOP_UI_LAYOUT.popoutSmall.spinCluster,
				},
			}
		: {
				utilScale: DESKTOP_UI_LAYOUT.utilScale,
				utilX: DESKTOP_UI_LAYOUT.utilX,
				spinCluster: DESKTOP_UI_LAYOUT.spinCluster,
			};
