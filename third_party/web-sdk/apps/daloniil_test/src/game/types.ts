import { type SpinningReelSymbolState } from 'utils-slots';
import type config from './config';

export type SymbolName = keyof typeof config.symbols;
export type RawSymbol = {
	name: SymbolName;
	multiplier?: number;
	scatter?: boolean;
	wild?: boolean;
	/** Target symbol during `mysteryReveal` animation (M spine pay tier). */
	mysteryRevealTo?: SymbolName;
	/** Use unified M spine clip when several mystery reels reveal together. */
	mysteryRevealSync?: boolean;
};
export type BetMode = keyof typeof config.betModes;
export type GameType = keyof typeof config.paddingReels;

export const SYMBOL_STATES = [
	'static',
	'spin',
	'land',
	'win',
	'postWinStatic',
	'explosion',
	'mysteryReveal',
] as const;

export type SymbolState = SpinningReelSymbolState | (typeof SYMBOL_STATES)[number];

export type Position = {
	reel: number;
	row: number;
};
