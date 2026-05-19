import _ from 'lodash';
import type { Tween } from 'svelte/motion';

import { stateBet, stateUi, stateMeta } from 'state-shared';
import { createEnhanceBoard, createReelForSpinning } from 'utils-slots';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import { CASH_STACKS_DEFAULT_ROUND } from './autoplay';

// Cash Stacks default: предвыбранные 50 раундов автоигры (SDK по дефолту
// ставит '10'). Делается при импорте модуля, до первого открытия модалки.
stateUi.autoSpinsText = CASH_STACKS_DEFAULT_ROUND as typeof stateUi.autoSpinsText;

/*
	Cash Stacks использует кастомные bet-mode keys (`bonus_normal`,
	`bonus_super`, `bonus_boost`, `special_spins`) — это то, что отдаёт math
	(см. game/config.ts). SDK-овский `stateMeta.betModeMeta` по дефолту
	содержит только BASE/ANTE/SUPERANTE/BONUS/SUPER (см. state-shared
	constants.ts), и при обращении к нашим ключам lookup возвращает null →
	`betCostMultiplier()` крашит весь HUD ("Cannot read properties of null
	(reading 'type')" в ButtonBetProvider).

	Регистрируем меты прямо здесь (до первого рендера UI). В реальной
	авторизации RGS перезапишет это полем `auth.betModes`, но локально/в
	storybook значения из SDK дефолтов не подходят.
*/
type BetModeMetaEntry = (typeof stateMeta.betModeMeta)[string];
const makeMeta = (
	mode: string,
	type: BetModeMetaEntry['type'],
	costMultiplier: number,
	title: string,
): BetModeMetaEntry => ({
	mode,
	costMultiplier,
	type,
	parent: '',
	children: '',
	assets: { icon: '', dialogImage: '', dialogVolatility: '', volatility: '', button: '' },
	text: {
		title,
		dialog: '',
		button: 'BUY',
		betAmountLabel: title,
		tickerIdle: '',
		tickerSpin: '',
	},
	maxWin: 50000,
});

stateMeta.betModeMeta = {
	...stateMeta.betModeMeta,
	BASE: stateMeta.betModeMeta.BASE,
	BONUS_BOOST: makeMeta('bonus_boost', 'activate', 2, 'BONUS BOOST'),
	bonus_boost: makeMeta('bonus_boost', 'activate', 2, 'BONUS BOOST'),
	SPECIAL_SPINS: makeMeta('special_spins', 'activate', 30, 'SPECIAL SPINS'),
	special_spins: makeMeta('special_spins', 'activate', 30, 'SPECIAL SPINS'),
	BONUS_NORMAL: makeMeta('bonus_normal', 'buy', 100, 'NORMAL BONUS'),
	bonus_normal: makeMeta('bonus_normal', 'buy', 100, 'NORMAL BONUS'),
	BONUS_SUPER: makeMeta('bonus_super', 'buy', 200, 'SUPER BONUS'),
	bonus_super: makeMeta('bonus_super', 'buy', 200, 'SUPER BONUS'),
};

import type { GameType, RawSymbol, SymbolState } from './types';
import { stateLayoutDerived } from './stateLayout';
import { winLevelMap } from './winLevelMap';
import { eventEmitter } from './eventEmitter';
import {
	SYMBOL_SIZE,
	BOARD_SIZES,
	BOARD_LAYOUT_OFFSET,
	INITIAL_BOARD,
	BOARD_DIMENSIONS,
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	INITIAL_SYMBOL_STATE,
	SCATTER_LAND_SOUND_MAP,
} from './constants';

const onSymbolLand = ({ rawSymbol }: { rawSymbol: RawSymbol }) => {
	if (rawSymbol.name === 'B') {
		eventEmitter.broadcast({ type: 'soundScatterCounterIncrease' });
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: SCATTER_LAND_SOUND_MAP[scatterLandIndex()],
		});
	}

	if (rawSymbol.name === 'W') {
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: 'sfx_multiplier_landing',
		});
	}
};

const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
	const reel = createReelForSpinning({
		reelIndex,
		symbolHeight: SYMBOL_SIZE,
		initialSymbols: INITIAL_BOARD[reelIndex],
		initialSymbolState: INITIAL_SYMBOL_STATE,
		onReelStopping: () => {
			eventEmitter.broadcast({
				type: 'soundOnce',
				name: 'sfx_reel_stop_1',
				forcePlay: !stateBet.isTurbo,
			});
		},
		onSymbolLand,
	});

	reel.reelState.spinOptions = () =>
		reel.reelState.spinType === 'fast' ? SPIN_OPTIONS_FAST : SPIN_OPTIONS_DEFAULT;

	return reel;
});

export type Reel = (typeof board)[number];
export type ReelSymbol = Reel['reelState']['symbols'][number];

export type MultiplierSymbol = {
	initX: number;
	initY: number;
	symbolX: Tween<number>;
	symbolY: Tween<number>;
	rawSymbol: RawSymbol;
	symbolState: SymbolState;
	oncomplete: () => void;
};

export const stateGame = $state({
	board,
	gameType: 'basegame' as GameType,
	multiplierBoard: [] as (MultiplierSymbol | undefined)[][],
	scatterCounter: 0,
	// === Cash Stacks specific ===
	// Bonus-символы, собранные в текущей FS-сессии (drives Progress Ladder).
	bonusCollected: 0,
	// Текущий уровень Progress Ladder (0 = старт, +1 каждые 4 собранных Bonus).
	ladderTier: 0,
	// Индексы барабанов с активным Sticky Mystery (для FS).
	mysteryReels: [] as number[],
	// Bonus Boost / Special Spins state (для autoplay).
	activeFeature: null as 'bonus_boost' | 'special_spins' | null,
	// Скорость игры (1 = normal, 2 = fast, 3 = ultra-fast) для меню Информация.
	// 1 → isTurbo=false; 2-3 → isTurbo=true. Полный gradient можно навесить
	// позже через timeScale-логику если нужно три уровня скорости.
	gameSpeed: 1 as 1 | 2 | 3,
	// Музыка вкл/выкл для меню Информация. Связана со stateSound.volumeValueMusic.
	musicEnabled: true,
});

const boardLayout = () => ({
	x: stateLayoutDerived.mainLayout().width * 0.5 + BOARD_LAYOUT_OFFSET.x,
	y: stateLayoutDerived.mainLayout().height * 0.5 + BOARD_LAYOUT_OFFSET.y,
	anchor: { x: 0.5, y: 0.5 },
	pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
	...BOARD_SIZES,
});

const boardRaw = () =>
	board.map((reel) => reel.reelState.symbols.map((reelSymbol) => reelSymbol.rawSymbol));

const scatterLandIndex = () => {
	if (stateGame.scatterCounter > 5) return 5;
	if (stateGame.scatterCounter < 1) return 1;
	return stateGame.scatterCounter as 1 | 2 | 3 | 4 | 5;
};

const { enhanceBoard } = createEnhanceBoard();
const enhancedBoard = enhanceBoard({ board: stateGame.board });

export const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({
	winLevelMap,
});

export const stateGameDerived = {
	onSymbolLand,
	boardLayout,
	boardRaw,
	scatterLandIndex,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
};
