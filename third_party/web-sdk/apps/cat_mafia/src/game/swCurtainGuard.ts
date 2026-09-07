/**
 * Hard rule: expanded / sticky Super Wild is ONLY the Spine curtain.
 * Board SW tiles (Wild.webp) may appear for a single lying SW before expand —
 * never as a 4-high stack. Call `ensureSwCurtainsForBoard` whenever the board
 * may hold a full SW column.
 */

import { BOARD_DIMENSIONS } from './constants';
import { stateGame } from './stateGame.svelte';

export const countVisibleSwOnReel = (
	reelIndex: number,
	board = stateGame.board,
): number => {
	const reel = board[reelIndex];
	if (!reel) return 0;
	let n = 0;
	for (let paddedRow = 1; paddedRow <= BOARD_DIMENSIONS.y; paddedRow++) {
		if (reel.reelState.symbols[paddedRow]?.rawSymbol.name === 'SW') n += 1;
	}
	return n;
};

export const isFullSwColumn = (reelIndex: number, board = stateGame.board) =>
	countVisibleSwOnReel(reelIndex, board) >= BOARD_DIMENSIONS.y;

/** Mult from a painted SW column (fallback 2). */
export const swMultOnReel = (reelIndex: number, board = stateGame.board) => {
	const reel = board[reelIndex];
	if (!reel) return 2;
	for (let paddedRow = 1; paddedRow <= BOARD_DIMENSIONS.y; paddedRow++) {
		const cell = reel.reelState.symbols[paddedRow];
		if (cell?.rawSymbol.name === 'SW') {
			const m = cell.rawSymbol.multiplier;
			if (typeof m === 'number' && m > 0) return m;
		}
	}
	return stateGame.stickySwByReel[reelIndex] || 2;
};

/**
 * Hide board SW art whenever a curtain must own the column.
 * Math: at most one *lying* SW per reel; after expand/sticky the column is
 * full (4 visible SW).
 *
 * Super intro (`stickySwIntroPending`): sticky is armed before the dropIn
 * curtain mounts — do NOT hide tiles yet or the column goes black.
 */
export const shouldHideBoardSwTile = (reelIndex: number): boolean => {
	if (stateGame.swSpineHideReels[reelIndex]) return true;
	if (stateGame.superWildCurtains.some((c) => c.reel === reelIndex)) return true;
	if (stateGame.stickySwIntroPending) return false;
	if (stateGame.stickySwByReel[reelIndex] != null) return true;
	if (isFullSwColumn(reelIndex)) return true;
	return false;
};

/**
 * Upsert idle curtains + hide flags for every full SW column / sticky reel.
 * Safe to call often — does not restart expanding / dropIn / dismiss.
 * Skips entirely during Super drop-in intro (owned by applyStickySwPreExpanded).
 */
export const ensureSwCurtainsForBoard = () => {
	// Super first spin: curtain must slide in via `dropIn`, not snap to `done`.
	if (stateGame.stickySwIntroPending) return;

	const originRow = Math.floor(BOARD_DIMENSIONS.y / 2) + 1;
	const list = stateGame.superWildCurtains.slice();
	const hide = { ...stateGame.swSpineHideReels };
	let curtainsChanged = false;
	let hideChanged = false;

	const ensureReel = (reel: number, mult: number) => {
		if (!hide[reel]) {
			hide[reel] = true;
			hideChanged = true;
		}
		const i = list.findIndex((c) => c.reel === reel);
		if (i >= 0) {
			const cur = list[i]!;
			// Keep in-flight motion; only refresh mult / fill holes.
			if (cur.phase === 'expanding' || cur.phase === 'dropIn' || cur.phase === 'dismiss') {
				if (cur.mult !== mult) {
					list[i] = { ...cur, mult };
					curtainsChanged = true;
				}
				return;
			}
			if (cur.phase !== 'done' || cur.mult !== mult) {
				list[i] = { reel, mult, phase: 'done', originRow: cur.originRow || originRow };
				curtainsChanged = true;
			}
			return;
		}
		list.push({ reel, mult, phase: 'done', originRow });
		curtainsChanged = true;
	};

	for (const key of Object.keys(stateGame.stickySwByReel)) {
		const reel = Number(key);
		if (Number.isNaN(reel)) continue;
		ensureReel(reel, stateGame.stickySwByReel[reel] || 2);
	}

	for (let reel = 0; reel < stateGame.board.length; reel++) {
		if (!isFullSwColumn(reel)) continue;
		const mult = stateGame.stickySwByReel[reel] ?? swMultOnReel(reel);
		if (stateGame.gameType === 'freegame' && stateGame.stickySwByReel[reel] !== mult) {
			stateGame.stickySwByReel[reel] = mult;
			stateGame.stickySwOpened = true;
		}
		ensureReel(reel, mult);
	}

	if (curtainsChanged) stateGame.superWildCurtains = list;
	if (hideChanged) stateGame.swSpineHideReels = hide;
};
