import { SYMBOL_SIZE } from './constants';

/** Desktop spinboard art (`spinboard.webp`) — brackets on the right. */
const DESKTOP_PANEL_RATIO = 582 / 334;
/** How far the right mounts overlap the board frame (unscaled board units). */
const DESKTOP_MOUNT_OVERLAP = SYMBOL_SIZE * -0.13;
/**
 * Vertical centre as a fraction of board visual height from the top
 * (PC-tuned; Popout inherits the same ratio).
 */
const DESKTOP_CHROME_CENTER_Y_FRAC = 0.2;
/** Spinboard width as a fraction of board visual width (PC: 1.75×SYMBOL / 500). */
const DESKTOP_PANEL_WIDTH_FRAC = (SYMBOL_SIZE * 1.75) / 500;

type MainLayoutLike = {
	x: number;
	y: number;
	width: number;
	height: number;
	scale: number;
};

type BoardLayoutLike = {
	x: number;
	y: number;
	scale: number;
	visualWidth: number;
	visualHeight: number;
};

/** Text anchor inside the spinboard (fraction of panel size). */
const DESKTOP_TEXT_X_FRAC = 0.436;
const DESKTOP_TEXT_Y_FRAC = 0.52;
/** Proxima-nova size vs panel width. */
const DESKTOP_FONT_WIDTH_FRAC = 0.11;
/** Shrink text if wider than this fraction of the panel. */
const DESKTOP_MAX_TEXT_WIDTH_FRAC = 0.72;

/** Screen px box for the PC FS spinboard (HTML FreeSpinCounter). */
export const getDesktopFsCounterScreenBox = (opts: {
	mainLayout: MainLayoutLike;
	boardLayout: BoardLayoutLike;
}) => {
	const ml = opts.mainLayout;
	const board = opts.boardLayout;
	const panelW = board.visualWidth * DESKTOP_PANEL_WIDTH_FRAC;
	const panelH = panelW / DESKTOP_PANEL_RATIO;
	const mount = DESKTOP_MOUNT_OVERLAP * board.scale;
	const localX = board.x - board.visualWidth * 0.5 - panelW + mount;
	const localY =
		board.y -
		board.visualHeight * 0.5 +
		board.visualHeight * DESKTOP_CHROME_CENTER_Y_FRAC -
		panelH * 0.5;
	const width = panelW * ml.scale;
	const height = panelH * ml.scale;
	return {
		left: ml.x + (localX - ml.width * 0.5) * ml.scale,
		top: ml.y + (localY - ml.height * 0.5) * ml.scale,
		width,
		height,
		fontSize: Math.max(10, width * DESKTOP_FONT_WIDTH_FRAC),
		textLeft: width * DESKTOP_TEXT_X_FRAC,
		textTop: height * DESKTOP_TEXT_Y_FRAC,
		maxTextWidth: width * DESKTOP_MAX_TEXT_WIDTH_FRAC,
	};
};

export const DESKTOP_FS_COUNTER_LAYOUT = {
	PANEL_RATIO: DESKTOP_PANEL_RATIO,
	TEXT_X_FRAC: DESKTOP_TEXT_X_FRAC,
	TEXT_Y_FRAC: DESKTOP_TEXT_Y_FRAC,
	MOUNT_OVERLAP: DESKTOP_MOUNT_OVERLAP,
	CHROME_CENTER_Y_FRAC: DESKTOP_CHROME_CENTER_Y_FRAC,
	PANEL_WIDTH_FRAC: DESKTOP_PANEL_WIDTH_FRAC,
} as const;
