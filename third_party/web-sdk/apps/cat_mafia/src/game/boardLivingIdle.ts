import {
	LIVING_IDLE_SYMBOL_ORDER,
	isSymbolCenterInPlayfield,
	isVisibleBoardSymbolIndex,
} from './constants';
import { stateGame } from './stateGame.svelte';
import type { SymbolName } from './types';

export type LivingIdleSymbol = (typeof LIVING_IDLE_SYMBOL_ORDER)[number];

const isLivingIdleSymbol = (name: SymbolName): name is LivingIdleSymbol =>
	(LIVING_IDLE_SYMBOL_ORDER as readonly string[]).includes(name);

/** Resting cells on the playfield viewport whose type has a living idle clip. */
export const collectLivingIdleTypesOnBoard = (): LivingIdleSymbol[] => {
	const present = new Set<LivingIdleSymbol>();

	for (const reel of stateGame.board) {
		const { symbols, activeSymbolCount } = reel.reelState;
		for (const symbol of symbols) {
			if (!isVisibleBoardSymbolIndex(symbol.symbolIndex, activeSymbolCount)) continue;
			if (!isSymbolCenterInPlayfield(symbol.symbolY())) continue;
			if (symbol.symbolState !== 'static' && symbol.symbolState !== 'postWinStatic') continue;
			if (!isLivingIdleSymbol(symbol.rawSymbol.name)) continue;
			present.add(symbol.rawSymbol.name);
		}
	}

	return LIVING_IDLE_SYMBOL_ORDER.filter((name) => present.has(name));
};

export const nextLivingIdleSymbol = (
	types: LivingIdleSymbol[],
	current: SymbolName | null,
): LivingIdleSymbol | null => {
	if (types.length === 0) return null;
	if (current == null) return types[0];
	const index = types.indexOf(current as LivingIdleSymbol);
	if (index < 0) return types[0];
	return types[(index + 1) % types.length];
};
