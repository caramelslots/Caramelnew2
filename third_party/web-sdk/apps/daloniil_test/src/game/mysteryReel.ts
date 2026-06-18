import type { RawSymbol, SymbolName } from './types';
import { stateGame } from './stateGame.svelte';

export const MYSTERY_RAW_SYMBOL: RawSymbol = { name: 'M' };

export const createMysteryColumnBoard = (reelLength: number): RawSymbol[] =>
	Array.from({ length: reelLength }, () => ({ ...MYSTERY_RAW_SYMBOL }));

export const isMysteryReelFrozen = (reelIndex: number) =>
	stateGame.mysteryReelsFrozen.includes(reelIndex);

export const isMysteryReelPendingCollapse = (reelIndex: number) =>
	stateGame.mysteryReelsPendingCollapse[reelIndex] !== undefined;

export const getMysteryReelPendingCollapseSymbol = (reelIndex: number): SymbolName | undefined =>
	stateGame.mysteryReelsPendingCollapse[reelIndex] as SymbolName | undefined;

export const getMysteryReelsPendingCollapseIndices = () =>
	Object.keys(stateGame.mysteryReelsPendingCollapse)
		.map(Number)
		.sort((a, b) => a - b);

export const markMysteryReelPendingCollapse = (
	reelIndex: number,
	revealedSymbol: SymbolName,
) => {
	stateGame.mysteryReelsPendingCollapse = {
		...stateGame.mysteryReelsPendingCollapse,
		[reelIndex]: revealedSymbol,
	};
};

const clearMysteryReelPendingCollapse = (reelIndex: number) => {
	if (!isMysteryReelPendingCollapse(reelIndex)) return;
	const next = { ...stateGame.mysteryReelsPendingCollapse };
	delete next[reelIndex];
	stateGame.mysteryReelsPendingCollapse = next;
};

export const freezeMysteryReel = (reelIndex: number) => {
	clearMysteryReelPendingCollapse(reelIndex);
	if (isMysteryReelFrozen(reelIndex)) return;
	stateGame.mysteryReelsFrozen = [...stateGame.mysteryReelsFrozen, reelIndex].sort(
		(a, b) => a - b,
	);
};

export const resetMysteryReelSession = () => {
	stateGame.mysteryReelsFrozen = [];
	stateGame.mysteryReelsPendingCollapse = {};
};

export const shouldSpinMysteryReel = (reelIndex: number) =>
	!isMysteryReelFrozen(reelIndex) && !isMysteryReelPendingCollapse(reelIndex);
