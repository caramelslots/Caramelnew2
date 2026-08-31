import _ from 'lodash';
import type { Tween } from 'svelte/motion';

import { stateBet, stateBetDerived, stateUi, stateMeta } from 'state-shared';
import { createEnhanceBoard, createReelForSpinning } from 'utils-slots';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import { CASH_STACKS_DEFAULT_ROUND } from './autoplay';

// Wok Fury default: предвыбранные 50 раундов автоигры (SDK по дефолту
// ставит '10'). Делается при импорте модуля, до первого открытия модалки.
stateUi.autoSpinsText = String(CASH_STACKS_DEFAULT_ROUND) as typeof stateUi.autoSpinsText;

/*
	Wok Fury использует кастомные bet-mode keys (`bonus_normal`,
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
	maxWin: 25000,
});

stateMeta.betModeMeta = {
	...stateMeta.betModeMeta,
	// Align mode display name with in-game "Base (1×)" terminology (not raw "BASE").
	BASE: makeMeta('BASE', 'default', 1, 'Base'),
	base: makeMeta('BASE', 'default', 1, 'Base'),
	BONUS_BOOST: makeMeta('bonus_boost', 'activate', 2, 'Bonus Boost'),
	bonus_boost: makeMeta('bonus_boost', 'activate', 2, 'Bonus Boost'),
	SPECIAL_SPINS: makeMeta('special_spins', 'activate', 30, 'Special Spin'),
	special_spins: makeMeta('special_spins', 'activate', 30, 'Special Spin'),
	BONUS_NORMAL: makeMeta('bonus_normal', 'buy', 100, 'Normal Bonus'),
	bonus_normal: makeMeta('bonus_normal', 'buy', 100, 'Normal Bonus'),
	BONUS_SUPER: makeMeta('bonus_super', 'buy', 200, 'Super Bonus'),
	bonus_super: makeMeta('bonus_super', 'buy', 200, 'Super Bonus'),
	BONUS_DUEL: makeMeta('bonus_duel', 'buy', 150, 'Duel'),
	bonus_duel: makeMeta('bonus_duel', 'buy', 150, 'Duel'),
	BONUS_DUEL_CAT: makeMeta('bonus_duel_cat', 'buy', 150, 'Duel Cat'),
	bonus_duel_cat: makeMeta('bonus_duel_cat', 'buy', 150, 'Duel Cat'),
	BONUS_DUEL_DOG: makeMeta('bonus_duel_dog', 'buy', 150, 'Duel Dog'),
	bonus_duel_dog: makeMeta('bonus_duel_dog', 'buy', 150, 'Duel Dog'),
};

import type { GameType, RawSymbol, SymbolName, SymbolState } from './types';
import { stateLayoutDerived } from './stateLayout';
import { winLevelMap } from './winLevelMap';
import { eventEmitter } from './eventEmitter';
import {
	SYMBOL_SIZE,
	BOARD_SIZES,
	BOARD_LAYOUT_OFFSETS,
	BOARD_LAYOUT_SCALE,
	getPortraitBoardScale,
	getPortraitDeviceWidth,
	getPortraitParchmentSize,
	INITIAL_BOARD,
	BOARD_DIMENSIONS,
	isVisibleBoardSymbolIndex,
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	INITIAL_SYMBOL_STATE,
	SCATTER_LAND_SOUND_MAP,
} from './constants';
import { devPreview } from './devPreview.svelte';
import { gameSpeedMultFor } from './gameSpeed';
import { REEL_SCROLL_SPEED_MULT_CAT, catSlowReelsAfterTrigger } from './catAnticipation';
import { targetPickInnerClip } from './targetBoardAssets';

const REEL_SCROLL_SPEED_MULT_SLOW = 0.5;

const withReelScrollSpeedMult = <T extends typeof SPIN_OPTIONS_DEFAULT>(
	options: T,
	mult: number,
): T => {
	if (mult === 1) return options;
	return {
		...options,
		reelBounceBackSpeed: options.reelBounceBackSpeed * mult,
		reelSpinSpeedBeforeBounce: options.reelSpinSpeedBeforeBounce * mult,
		reelPreSpinSpeed: options.reelPreSpinSpeed * mult,
		reelSpinSpeed: options.reelSpinSpeed * mult,
		reelSpinDelay: Math.max(0, Math.round(options.reelSpinDelay / mult)),
		reelLandSquashRecoveryMs: Math.max(0, Math.round(options.reelLandSquashRecoveryMs / mult)),
	};
};

const onSymbolLand = ({
	rawSymbol,
	symbolIndex = 0,
	activeSymbolCount = BOARD_DIMENSIONS.y,
}: {
	rawSymbol: RawSymbol;
	symbolIndex?: number;
	activeSymbolCount?: number;
}) => {
	if (!isVisibleBoardSymbolIndex(symbolIndex, activeSymbolCount)) return;

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
			if (stateGame.catSlowTriggerReel === reelIndex) {
				stateGame.catSlowReels = catSlowReelsAfterTrigger(reelIndex, stateGame.board.length);
			}
		},
		onSymbolLand,
	});

	reel.reelState.spinOptions = () => {
		const base = reel.reelState.spinType === 'fast' ? SPIN_OPTIONS_FAST : SPIN_OPTIONS_DEFAULT;
		const devMult = devPreview.slowReelScroll ? REEL_SCROLL_SPEED_MULT_SLOW : 1;
		const catMult = stateGame.catSlowReels.includes(reelIndex) ? REEL_SCROLL_SPEED_MULT_CAT : 1;
		return withReelScrollSpeedMult(base, devMult * catMult * gameSpeedMultFor(stateGame.gameSpeed));
	};

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
	/** Reels that slow down after the 2nd cat lands (basegame). Cleared after each spin. */
	catSlowReels: [] as number[],
	/** Reel whose stop activates cat slow-down (-1 = off). Set before spin, cleared after. */
	catSlowTriggerReel: -1 as number,
	// === Wok Fury specific ===
	// Bonus-символы, собранные в текущей FS-сессии (drives Progress Ladder).
	bonusCollected: 0,
	// Текущий уровень Progress Ladder (0 = старт, +1 каждые 4 собранных Bonus).
	ladderTier: 0,
	// Индексы барабанов с активным Sticky Mystery (для FS).
	mysteryReels: [] as number[],
	// Барабаны, которые уже прошли первый reveal и заморожены (показывают ?).
	mysteryReelsFrozen: [] as number[],
	// Барабаны, у которых reveal сыграл и ждёт схлопывания обратно к ?.
	// Record<reelIndex, revealedSymbol>
	mysteryReelsPendingCollapse: {} as Record<number, string>,
	// Bonus Boost / Special Spins state (для autoplay).
	activeFeature: null as 'bonus_boost' | 'special_spins' | null,
	// Скорость игры: 1 = normal, 2 = 1.5× normal scroll, 3 = 2× fast scroll (см. gameSpeed.ts).
	// isTurbo (SDK fast spin) только для уровня 3.
	gameSpeed: 1 as 1 | 2 | 3,
	// Музыка вкл/выкл для меню Информация. Связана со stateSound.volumeValueMusic.
	musicEnabled: true,
	// Подсветка выигрыша: пока true — все символы вне 'win'/'postWinStatic'
	// затемняются (см. DIM_NON_WINNING + ReelSymbol.svelte). Поднимается
	// хелпером animateSymbols в bookEventHandlerMap, сбрасывается в reveal.
	winSpotlightActive: false,
	// В книге текущего спина позже есть pawCoinResolve: лапа (PB/PS/PG) не
	// тускнеет во время фазы-1 линий — конверсия в монетки идёт следом,
	// после снятия spotlight (тот же two-beat, что у шторы SW).
	pawPending: false,
	// Idle symbol tease (matching symbols bounce while waiting). Disabled after
	// any win on the current board; re-enabled when the next losing spin settles.
	idleBounceAllowed: true,
	/** Symbol type currently playing living idle. Null = all idle spines frozen. */
	livingIdleActive: false,
	// Cloud transition covers HTML overlays while active.
	transitionActive: false,
	/** Target mode for the in-flight cloud transition (set for the whole anim). */
	transitionGameType: undefined as GameType | undefined,
	/**
	 * Active Pixi cat spine key (gray base / white FS|duel).
	 * Phone unloads the other atlas — see EnableMascotCatSkinMemory.
	 */
	mascotCatSpineKey: 'mascotCatGray' as 'mascotCat' | 'mascotCatGray',
	// Big-win overlay only — raises Pixi canvas above HTML HUD so celebration
	// renders on top while the dim layer keeps controls visible underneath.
	// Small/medium wins leave this false so the HUD stays at normal stacking.
	winOverlayActive: false,
	// Matching CanvasSizeRectangle alpha (big win 0.5 / FS end 0.85). The HTML
	// mascot sits outside Pixi, so it uses this to brightness-match the board.
	overlayDimAlpha: 0,
	// FS intro board is an HTML overlay.
	freeSpinIntroActive: false,
	// Duel rules splash (Press to continue) before cloud transition.
	duelIntroActive: false,
	// === Cat Mafia Stage B ===
	pawCoinCells: [] as {
		reel: number;
		row: number;
		tier: 0 | 1 | 2 | 3;
		win: number;
		/** Wave pop-in delay from the nearest paw cell (base 1× speed ms). */
		appearDelayMs: number;
		/** Chebyshev ring from the nearest paw (0 = closest coin cells). */
		appearRing: number;
	}[],
	pawCoinTotal: 0,
	/** Show catch UI near the mascot hat while paw coins resolve. */
	pawCoinBagVisible: false,
	/** Coins animate from board cells into the mascot hat. */
	pawCoinFlying: false,
	/** Bumps each paw resolve so appear_flash remounts from the start. */
	pawCoinPlayId: 0,
	superWildCurtain: null as null | {
		reel: number;
		mult: number;
		phase: 'expanding' | 'done';
	},
	/** 0 = symbols in playfield; 1 = symbols parked below the mask (target board in). */
	targetPickSlide: 0,
	/** Target-pick cabinet is mounted (Pixi plate under the desk frame). */
	targetPickOpen: false,
	/** `six` = entry pick (6 seats); `nine` = Stage E extra-FS shoot. */
	targetPickSeatMode: 'six' as 'six' | 'nine',
	targetPickFlipped: Array.from({ length: 6 }, () => false),
	targetPickSpineSeat: null as number | null,
	/** Pixi tir shot FX (replaces HTML TargetShotBulletOverlay). */
	targetShotFlight: null as null | import('./shotBulletAssets').TargetShotFlight,
	/** Monotonic flight id — survives `targetShotFlight = null` between shots. */
	targetShotFlightSeq: 0,
	/** Pixi tir seat flip (replaces HTML TargetFlipSpine). */
	targetShotFlip: null as null | import('./targetBoardAssets').TargetShotFlipFx,
	/** HTML FS label driven by Pixi flip bone (avoids Text size jump). */
	targetShotFlipLabel: null as null | { visible: boolean; scaleX: number; scaleY: number },
	// === Cat Mafia Stage D ===
	/** Normal vs Super bonus rules for Super Wild. */
	bonusMode: null as null | 'normal' | 'super',
	/** FS sticky SW columns: reel index → multiplier (0..many). */
	stickySwByReel: {} as Record<number, number>,
	/** True once at least one SW column is open (Super: from start). */
	stickySwOpened: false,
	/** Bullets in revolver drum (0..6). */
	drumCount: 0,
	/**
	 * Absolute cylinder angle (CSS deg, + = CW).
	 * Load advances CW so the next empty sits at 12 o'clock; Stage E shoots
	 * from that port and steps CCW (decreasing deg).
	 */
	drumRotationDeg: 0,
	/** Per-chamber CARAMEL spin (deg) assigned on insert. */
	drumBulletOrientDeg: {} as Record<number, number>,
	/** Bumped per chamber when a round seats — drives the fade/scale-in anim. */
	drumSeatAnimKey: {} as Record<number, number>,
	/** Chambers currently showing spent (`bullet_2`) art — same orient as insert. */
	drumSpentChambers: {} as Record<number, true>,
	/** Bumped to replay the left/right drum shake animation. */
	drumShakeKey: 0,
	/** Chamber index briefly showing the fired bullet art during Stage E. */
	drumFiringChamber: null as number | null,
	/** True while the Stage E shoot overlay is up (keeps drum above the dimmer). */
	drumShootActive: false,
	/** Main FS awarded at target pick — bullets only during these spins. */
	fsMainTotal: 0,
	/** True after main FS end shooting awards extra spins (Stage E). */
	fsExtraPhase: false,
	/** Keep revolver drum mounted from pre-FS cloud through outro. */
	fsDrumWanted: false,
	/** Brief fly UX: one or more BT cells → cat hand (simultaneous). */
	bulletFly: null as null | { reel: number; row: number; chamber: number; key: number }[],
	/**
	 * Live barrel tip in screen space — from Spine flash bone `main4`
	 * (see MascotGunMuzzleTracker). Null when the mascot is unmounted.
	 */
	mascotGunMuzzleScreen: null as null | { x: number; y: number },
	/** Mascot pose → Spine clip map in `mascotHtmlSpine.ts`. */
	mascotPose: 'idle' as
		| 'idle'
		| 'load'
		| 'aim'
		| 'shoot'
		| 'gunStart'
		| 'gunShotEnd'
		| 'gunEndLoad'
		| 'gunStatIdle'
		| 'gunStatLoad'
		| 'react'
		| 'wow'
		| 'clap'
		| 'hatCatch'
		| 'hatOn',
	/** Bump to re-fire the same one-shot pose (e.g. gun_shot × N back-to-back). */
	mascotAnimToken: 0,
});

/** Board symbol spines / land bounce stay at 1× — turbo only shortens waits + reel scroll. */
stateBetDerived.timeScale = () => 1;

const baseBoardLayout = () => {
	const layoutType = stateLayoutDerived.layoutType();
	const offset = BOARD_LAYOUT_OFFSETS[layoutType];
	const ml = stateLayoutDerived.mainLayout();
	const parchment = layoutType === 'portrait' ? getPortraitParchmentSize() : null;
	const scale =
		layoutType === 'portrait'
			? getPortraitBoardScale(
					ml.scale,
					stateLayoutDerived.canvasSizeType(),
					getPortraitDeviceWidth(stateLayoutDerived.canvasSizes()),
				)
			: (BOARD_LAYOUT_SCALE[layoutType as keyof typeof BOARD_LAYOUT_SCALE] ?? 1);

	const visualWidth = parchment ? parchment.width * scale : BOARD_SIZES.width * scale;
	const visualHeight = parchment ? parchment.height * scale : BOARD_SIZES.height * scale;

	return {
		x: ml.width * 0.5 + offset.x,
		y: ml.height * 0.5 + offset.y,
		anchor: { x: 0.5, y: 0.5 },
		pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
		width: BOARD_SIZES.width,
		height: BOARD_SIZES.height,
		scale,
		visualWidth,
		visualHeight,
	};
};

/** During Duel the dual desks use getDuelPixiBoardLayout in DuelPixiBoard. */
const boardLayout = () => baseBoardLayout();

const boardRaw = () =>
	board.map((reel) => reel.reelState.symbols.map((reelSymbol) => reelSymbol.rawSymbol));

const scatterLandIndex = () => {
	if (stateGame.scatterCounter > 5) return 5;
	if (stateGame.scatterCounter < 1) return 1;
	return stateGame.scatterCounter as 1 | 2 | 3 | 4 | 5;
};

/** True while any reel is scrolling or landing (pre-spin, spin, bounce). */
const boardReelsActive = () => stateGame.board.some((reel) => reel.reelState.motion !== 'stopped');

/** True while any visible cell plays Mystery reveal or collapse spine. */
const boardMysteryAnimating = () =>
	stateGame.board.some((reel) =>
		reel.reelState.symbols
			.slice(0, reel.reelState.activeSymbolCount)
			.some(
				(symbol) =>
					symbol.symbolState === 'mysteryReveal' || symbol.symbolState === 'mysteryCollapse',
			),
	);

/** True while any visible cell plays idle-tease pop animation. */
const boardIdleBouncing = () =>
	stateGame.board.some((reel) =>
		reel.reelState.symbols
			.slice(0, reel.reelState.activeSymbolCount)
			.some((symbol) => symbol.symbolState === 'idleBounce'),
	);

const { enhanceBoard } = createEnhanceBoard();
const targetPickBoardY = () =>
	// Same travel as the Pixi/HTML cabinet (`(slide-1)*clip.height`) so symbols
	// and the board keep pace — no growing gap under the mask.
	stateGame.targetPickSlide * targetPickInnerClip().height;

const enhancedBoard = enhanceBoard({ board: stateGame.board });

export const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({
	winLevelMap,
});

export const stateGameDerived = {
	onSymbolLand,
	boardLayout,
	/** Normal (non-duel) board geometry — use for dual-desk HTML layout. */
	baseBoardLayout,
	boardRaw,
	boardReelsActive,
	boardMysteryAnimating,
	boardIdleBouncing,
	/** Board-local Y (px) to park symbols under the playfield mask. */
	targetPickBoardY,
	scatterLandIndex,
	enhancedBoard,
	getWinLevelDataByWinLevelAlias,
};
