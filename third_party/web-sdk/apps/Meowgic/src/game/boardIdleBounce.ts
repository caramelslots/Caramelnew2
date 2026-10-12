import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

import {
	IDLE_BOUNCE_ANIMATION_TIMEOUT_MS,
	isVisibleBoardSymbolIndex,
} from './constants';
import { stateGame } from './stateGame.svelte';
import type { ReelSymbol } from './stateGame.svelte';
import type { SymbolName } from './types';

export type SymbolGroup = [SymbolName, ReelSymbol[]];

/** Visible `static` cells grouped by symbol name (only groups with 2+ cells). */
export const collectIdleBounceGroups = (): SymbolGroup[] => {
	const groups = new Map<SymbolName, ReelSymbol[]>();

	for (const reel of stateGame.board) {
		const { symbols, activeSymbolCount } = reel.reelState;
		for (const reelSymbol of symbols) {
			if (!isVisibleBoardSymbolIndex(reelSymbol.symbolIndex, activeSymbolCount)) continue;
			if (reelSymbol.symbolState !== 'static') continue;
			const name = reelSymbol.rawSymbol.name;
			const bucket = groups.get(name);
			if (bucket) bucket.push(reelSymbol);
			else groups.set(name, [reelSymbol]);
		}
	}

	return [...groups.entries()].filter(([, cells]) => cells.length >= 2);
};

export const pickIdleBounceGroup = (
	groups: SymbolGroup[],
	lastSymbol: SymbolName | null,
): SymbolGroup | null => {
	if (groups.length === 0) return null;
	const candidates =
		lastSymbol != null && groups.length > 1
			? groups.filter(([name]) => name !== lastSymbol)
			: groups;
	return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
};

const waitForIdleBounceComplete = (reelSymbol: ReelSymbol) =>
	Promise.race([
		waitForResolve((resolve) => {
			reelSymbol.oncomplete = resolve;
		}),
		waitForTimeout(IDLE_BOUNCE_ANIMATION_TIMEOUT_MS),
	]);

/** Snap any in-flight idle-bounce cells back to their resting pose. */
export const resetIdleBounceSymbols = () => {
	for (const reel of stateGame.board) {
		for (const reelSymbol of reel.reelState.symbols) {
			if (reelSymbol.symbolState === 'idleBounce') {
				reelSymbol.symbolState = 'static';
			}
		}
	}
};

export const bounceIdleSymbolGroup = async (cells: ReelSymbol[]) => {
	for (const cell of cells) {
		if (cell.symbolState !== 'static') continue;
		cell.symbolState = 'idleBounce';
	}

	const bouncing = cells.filter((cell) => cell.symbolState === 'idleBounce');
	if (bouncing.length === 0) return;

	await Promise.all(bouncing.map((cell) => waitForIdleBounceComplete(cell)));

	for (const cell of bouncing) {
		if (cell.symbolState === 'idleBounce') {
			cell.symbolState = 'static';
		}
	}
};
